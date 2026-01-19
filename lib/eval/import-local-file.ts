import { resolveFilePathOrThrow } from "lib/runner/resolveFilePath"
import { dirname } from "lib/utils/dirname"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import Debug from "debug"
import { isStaticAssetPath } from "lib/shared/static-asset-extensions"
import { transformWithSucrase } from "lib/transpile/transform-with-sucrase"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"

const debug = Debug("tsci:eval:import-local-file")

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
    if (fsPath.endsWith(".json")) {
      const jsonData = JSON.parse(fileContent)
      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: jsonData,
      }
    } else if (fsPath.endsWith(".kicad_pcb")) {
      const converter = new KicadToCircuitJsonConverter()
      converter.addFile(fsPath, fileContent)
      converter.runUntilFinished()
      const circuitJson = converter.getOutput()
      preSuppliedImports[fsPath] = {
        __esModule: true,
        circuitJson: circuitJson,
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
        // Add #ext= fragment so downstream can detect file type from blob URL
        const ext = fsPath.split(".").pop()
        staticUrl = `${URL.createObjectURL(blob)}#ext=${ext}`
      }

      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: staticUrl,
      }
    } else if (fsPath.endsWith(".tsx") || fsPath.endsWith(".ts")) {
      const importNames = getImportsFromCode(fileContent)

      for (const importName of importNames) {
        if (!preSuppliedImports[importName]) {
          await importEvalPath(importName, ctx, depth + 1, {
            cwd: dirname(fsPath),
          })
        }
      }

      try {
        const transformedCode = transformWithSucrase(fileContent, fsPath)
        debug("evalCompiledJs called with:", {
          code: transformedCode.slice(0, 100),
          dirname: dirname(fsPath),
        })
        const importRunResult = evalCompiledJs(
          transformedCode,
          preSuppliedImports,
          dirname(fsPath),
        )
        debug("importRunResult:", {
          fsPath,
          importRunResult,
        })
        preSuppliedImports[fsPath] = importRunResult.exports
      } catch (error: any) {
        throw new Error(
          `Eval compiled js error for "${importName}": ${error.message}`,
        )
      }
    } else if (fsPath.endsWith(".js") || fsPath.endsWith(".mjs")) {
      // For .js/.mjs files, especially from node_modules, we need to extract and resolve imports first
      const importNames = getImportsFromCode(fileContent)

      for (const importName of importNames) {
        if (!preSuppliedImports[importName]) {
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
