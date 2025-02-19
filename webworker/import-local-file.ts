import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import * as Babel from "@babel/standalone"
import { evalCompiledJs } from "./eval-compiled-js"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"

export const importLocalFile = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  const { fsMap, preSuppliedImports } = ctx

  const fsPath = importName.slice(2)
  if (!ctx.fsMap[fsPath]) {
    throw new Error(`File "${fsPath}" not found`)
  }
  const fileContent = fsMap[fsPath]
  if (fsPath.endsWith(".json")) {
    const parsed = JSON.parse(fileContent)
    preSuppliedImports[fsPath] = parsed
    preSuppliedImports[importName] = parsed
  } else if (fsPath.endsWith(".tsx")) {
    // Set placeholder for the module to handle circular dependencies
    preSuppliedImports[fsPath] = {}
    preSuppliedImports[importName] = preSuppliedImports[fsPath]

    const importNames = getImportsFromCode(fileContent)

    for (const depImportName of importNames) {
      if (
        !preSuppliedImports[depImportName] &&
        !(
          depImportName.startsWith("./") &&
          preSuppliedImports[depImportName.slice(2)]
        )
      ) {
        await importEvalPath(depImportName, ctx, depth + 1)
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
      const importRunResult = evalCompiledJs(result.code, preSuppliedImports)
      // Update the cache with the evaluated exports
      preSuppliedImports[fsPath] = importRunResult.exports
      preSuppliedImports[importName] = importRunResult.exports
    } catch (error: any) {
      throw new Error(
        `Eval compiled js error for "${importName}": ${error.message}`,
      )
    }
  } else if (fsPath.endsWith(".js")) {
    // Similar placeholder technique for .js files
    preSuppliedImports[fsPath] = {}
    preSuppliedImports[importName] = preSuppliedImports[fsPath]

    const importRunResult = evalCompiledJs(fileContent, preSuppliedImports)
    preSuppliedImports[fsPath] = importRunResult.exports
    preSuppliedImports[importName] = importRunResult.exports
  } else {
    throw new Error(
      `Unsupported file extension "${fsPath.split(".").pop()}" for "${fsPath}"`,
    )
  }
}
