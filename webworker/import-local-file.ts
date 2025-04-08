import * as Babel from "@babel/standalone"
import { resolveFilePathOrThrow } from "lib/runner/resolveFilePath"
import { dirname } from "lib/utils/dirname"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"

export const importLocalFile = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  const { fsMap, preSuppliedImports } = ctx

  const fsPath = resolveFilePathOrThrow(importName, fsMap)
  if (!ctx.fsMap[fsPath]) {
    throw new Error(`File "${fsPath}" not found`)
  }
  const fileContent = fsMap[fsPath]
  if (fsPath.endsWith(".json")) {
    const jsonData = JSON.parse(fileContent)
    preSuppliedImports[fsPath] = {
      __esModule: true,
      default: jsonData,
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

    const result = Babel.transform(fileContent, {
      presets: ["react", "typescript"],
      plugins: ["transform-modules-commonjs"],
      filename: "virtual.tsx",
    })

    if (!result || !result.code) {
      throw new Error("Failed to transform code")
    }

    try {
      const importRunResult = evalCompiledJs(
        result.code,
        preSuppliedImports,
        dirname(fsPath),
      )
      preSuppliedImports[fsPath] = importRunResult.exports
    } catch (error: any) {
      throw new Error(
        `Eval compiled js error for "${importName}": ${error.message}`,
      )
    }
  } else if (fsPath.endsWith(".js")) {
    // For .js files, especially from node_modules, we need to transform them
    const result = Babel.transform(fileContent, {
      presets: ["env"],
      plugins: ["transform-modules-commonjs"],
      filename: fsPath,
    })

    if (!result || !result.code) {
      throw new Error("Failed to transform JS code")
    }

    preSuppliedImports[fsPath] = evalCompiledJs(
      result.code,
      preSuppliedImports,
      dirname(fsPath),
    ).exports
  } else {
    throw new Error(
      `Unsupported file extension "${fsPath.split(".").pop()}" for "${fsPath}"`,
    )
  }
}
