import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import * as Babel from "@babel/standalone"
import { importLocalFile } from "./import-local-file"
import { importSnippet } from "./import-snippet"
import { resolveFilePath } from "lib/runner/resolveFilePath"
import { resolveNodeModule } from "lib/utils/resolve-node-module"
import { importNodeModule } from "./import-node-module"

export async function importEvalPath(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
  opts: {
    cwd?: string
  } = {},
) {
  if (ctx.verbose) {
    console.log(`[Worker] ${"  ".repeat(depth)}➡️`, importName)
  }
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return
  if (importName.startsWith("./") && preSuppliedImports[importName.slice(2)])
    return

  if (depth > 5) {
    console.log("Max depth for imports reached")
    return
  }

  const resolvedLocalImportPath = resolveFilePath(
    importName,
    ctx.fsMap,
    opts.cwd,
  )
  if (resolvedLocalImportPath) {
    return importLocalFile(resolvedLocalImportPath, ctx, depth)
  }

  // Try to resolve from node_modules
  const resolvedNodeModulePath = resolveNodeModule(
    importName,
    ctx.fsMap,
    opts.cwd || "",
  )
  console.log("Resolved node module path:", resolvedNodeModulePath)
  if (resolvedNodeModulePath) {
    console.log(
      "[Worker] Importing resolved node module file:",
      resolvedNodeModulePath,
    );
    return importNodeModule(importName, ctx, depth);
  }

  if (importName.startsWith("@tsci/")) {
    return importSnippet(importName, ctx, depth)
  }

  throw new Error(
    `Unresolved import "${importName}" ${opts.cwd ? `from directory "${opts.cwd}"` : ""}`,
  )
}
