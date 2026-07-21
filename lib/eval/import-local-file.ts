import type { PlatformConfig } from "@tscircuit/props"
import Debug from "debug"
import { resolveFilePathOrThrow } from "lib/runner/resolveFilePath"
import { isStaticAssetPath } from "lib/shared/static-asset-extensions"
import { transformWithSucrase } from "lib/transpile/transform-with-sucrase"
import { dirname } from "lib/utils/dirname"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { getTypeExportsFromCode } from "lib/utils/get-type-exports-from-code"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import { hasPreSuppliedImport } from "./pre-supplied-imports"

const debug = Debug("tsci:eval:import-local-file")

const getFileExtension = (fsPath: string) => {
  const ext = fsPath.split(".").pop()
  return ext ? ext.toLowerCase() : ""
}

const getStaticFileLoader = (
  platform: PlatformConfig | undefined,
  fsPath: string,
) => {
  const ext = getFileExtension(fsPath)
  if (!ext) return undefined

  return (
    platform?.staticFileLoaderMap?.[ext] ??
    platform?.staticFileLoaderMap?.[`.${ext}`]
  )
}

const normalizeStaticFileLoaderResult = (result: any) => {
  if (result && typeof result === "object" && result.__esModule) {
    return result
  }

  return {
    __esModule: true,
    default: result,
  }
}

const resolveStaticFileLoaderInput = async (
  fileContent: string,
  fsPath: string,
  platform: PlatformConfig | undefined,
): Promise<string | ArrayBuffer> => {
  const isStaticAssetMarker = fileContent === "__STATIC_ASSET__"
  const isBlobUrl = fileContent.startsWith("blob:")
  if (!isStaticAssetMarker && !isBlobUrl) return fileContent

  let assetUrl = fileContent
  if (isStaticAssetMarker) {
    const projectBaseUrl = platform?.projectBaseUrl?.replace(/\/$/, "")
    if (!projectBaseUrl) return fileContent
    const normalizedPath = fsPath.startsWith("./") ? fsPath.slice(2) : fsPath
    assetUrl = `${projectBaseUrl}/${normalizedPath}`
  }

  const response = await (platform?.platformFetch ?? globalThis.fetch)(assetUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch static file content from "${assetUrl}" (HTTP ${response.status})`,
    )
  }

  return response.arrayBuffer()
}

export const importLocalFile = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  debug("importLocalFile called with:", {
    importName,
  })

  const { fsMap, preSuppliedImports, importStack, currentlyImporting } = ctx

  const fsPath = resolveFilePathOrThrow(importName, fsMap, undefined, {
    tsConfig: ctx.tsConfig,
  })
  debug("fsPath:", fsPath)
  if (currentlyImporting.has(fsPath)) {
    const cycleStartIndex = importStack.indexOf(fsPath)
    const cyclePath =
      cycleStartIndex >= 0
        ? importStack.slice(cycleStartIndex).concat(fsPath)
        : [...importStack, fsPath]
    throw new Error(
      `Circular dependency detected while importing "${fsPath}". The following import chain forms a cycle:\n\n${cyclePath.join(
        " -> ",
      )}`,
    )
  }

  if (!ctx.fsMap[fsPath]) {
    debug("fsPath not found in fsMap:", fsPath)
    throw new Error(`File "${fsPath}" not found`)
  }
  const fileContent = fsMap[fsPath]
  debug("fileContent:", fileContent?.slice(0, 100))
  currentlyImporting.add(fsPath)
  importStack.push(fsPath)
  try {
    const staticFileLoader = getStaticFileLoader(ctx.circuit.platform, fsPath)

    if (staticFileLoader) {
      try {
        const loaderInput = await resolveStaticFileLoaderInput(
          fileContent,
          fsPath,
          ctx.circuit.platform,
        )
        preSuppliedImports[fsPath] = normalizeStaticFileLoaderResult(
          await staticFileLoader(loaderInput),
        )
      } catch (error: any) {
        const ext = getFileExtension(fsPath)
        throw new Error(
          `Failed to load static file "${fsPath}" with platformConfig.staticFileLoaderMap["${ext}"]: ${error.message}`,
        )
      }
    } else if (fsPath.endsWith(".json")) {
      const jsonData = JSON.parse(fileContent)
      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: jsonData,
      }
    } else if (isStaticAssetPath(fsPath)) {
      let staticUrl: string

      if (fileContent === "__STATIC_ASSET__") {
        // Placeholder: use projectBaseUrl for static file imports
        const platformConfig = ctx.circuit.platform
        staticUrl = `${platformConfig?.projectBaseUrl ?? ""}/${
          fsPath.startsWith("./") ? fsPath.slice(2) : fsPath
        }`
      } else if (fileContent.startsWith("blob:")) {
        // Browser provided a blob URL directly, use it as-is
        staticUrl = `${fileContent}#ext=${fsPath.split(".").pop()}`
      } else {
        // Actual file content: create a blob URL
        const blob = new Blob([fileContent], {
          type: fsPath.endsWith(".kicad_mod")
            ? "text/plain"
            : "application/octet-stream",
        })
        // Add #ext= fragment only for STEP files so downstream can detect file type
        const ext = fsPath.split(".").pop()?.toLowerCase()
        const isStepFile = ext === "step" || ext === "stp"
        const blobUrl = URL.createObjectURL(blob)
        staticUrl = isStepFile ? `${blobUrl}#ext=${ext}` : blobUrl
      }

      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: staticUrl,
      }
    } else if (fsPath.endsWith(".tsx") || fsPath.endsWith(".ts")) {
      const importNames = getImportsFromCode(fileContent)

      for (const importName of importNames) {
        if (!hasPreSuppliedImport(preSuppliedImports, importName)) {
          await importEvalPath(importName, ctx, depth + 1, {
            cwd: dirname(fsPath),
          })
        }
      }

      const transformedCode = transformWithSucrase(fileContent, fsPath)
      try {
        debug("evalCompiledJs called with:", {
          code: transformedCode.slice(0, 100),
          dirname: dirname(fsPath),
        })
        const typeExports = getTypeExportsFromCode(fileContent)
        const importRunResult = evalCompiledJs(
          transformedCode,
          preSuppliedImports,
          dirname(fsPath),
        )
        debug("importRunResult:", {
          fsPath,
          importRunResult,
        })
        const moduleExports = importRunResult.exports
        if (typeExports.length > 0) {
          moduleExports.__typeOnlyExports__ = typeExports
        }
        preSuppliedImports[fsPath] = moduleExports
      } catch (error: any) {
        throw new Error(`Error evaluating "${fsPath}": ${error.message}`)
      }
    } else if (fsPath.endsWith(".js") || fsPath.endsWith(".mjs")) {
      // For .js/.mjs files, especially from node_modules, we need to extract and resolve imports first
      const importNames = getImportsFromCode(fileContent)

      for (const importName of importNames) {
        if (!hasPreSuppliedImport(preSuppliedImports, importName)) {
          await importEvalPath(importName, ctx, depth + 1, {
            cwd: dirname(fsPath),
          })
        }
      }

      // Then transform and evaluate
      preSuppliedImports[fsPath] = evalCompiledJs(
        transformWithSucrase(fileContent, fsPath),
        preSuppliedImports,
        dirname(fsPath),
      ).exports
    } else {
      throw new Error(
        `Unsupported file extension "${fsPath.split(".").pop()}" for "${fsPath}"`,
      )
    }
  } finally {
    importStack.pop()
    currentlyImporting.delete(fsPath)
  }
}
