import {
  resolveFilePath,
  resolveFilePathOrThrow,
} from "lib/runner/resolveFilePath"
import { dirname } from "lib/utils/dirname"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import Debug from "debug"
import { isStaticAssetPath } from "lib/shared/static-asset-extensions"
import { transformWithSucrase } from "./transform-with-sucrase"

const debug = Debug("tsci:eval:import-local-file")

export const importLocalFile = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
  opts: {
    /** The resolved file system path (if different from importName) */
    resolvedPath?: string
  } = {},
) => {
  debug("importLocalFile called with:", {
    importName,
    opts,
  })

  const { fsMap, preSuppliedImports } = ctx

  const fsPath =
    opts.resolvedPath ??
    resolveFilePathOrThrow(importName, {
      fsMap,
      tsconfigPaths: ctx.tsconfigPaths,
    })
  debug("fsPath:", fsPath)
  if (!ctx.fsMap[fsPath]) {
    debug("fsPath not found in fsMap:", fsPath)
    throw new Error(`File "${fsPath}" not found`)
  }
  const fileContent = fsMap[fsPath]
  debug("fileContent:", fileContent?.slice(0, 100))
  if (fsPath.endsWith(".json")) {
    const jsonData = JSON.parse(fileContent)
    preSuppliedImports[importName] = {
      __esModule: true,
      default: jsonData,
    }
  } else if (isStaticAssetPath(fsPath)) {
    const platformConfig = ctx.circuit.platform
    // Use projectBaseUrl for static file imports
    const staticUrl = `${platformConfig?.projectBaseUrl ?? ""}/${fsPath.startsWith("./") ? fsPath.slice(2) : fsPath}`
    preSuppliedImports[importName] = {
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
      preSuppliedImports[importName] = importRunResult.exports
    } catch (error: any) {
      throw new Error(
        `Eval compiled js error for "${importName}": ${error.message}`,
      )
    }
  } else if (fsPath.endsWith(".js")) {
    // For .js files, especially from node_modules, we need to transform them
    preSuppliedImports[importName] = evalCompiledJs(
      transformWithSucrase(fileContent, fsPath),
      preSuppliedImports,
      dirname(fsPath),
    ).exports
  } else {
    throw new Error(
      `Unsupported file extension "${fsPath.split(".").pop()}" for "${fsPath}"`,
    )
  }
}
