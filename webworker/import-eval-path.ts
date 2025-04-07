import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import * as Babel from "@babel/standalone"
import { importLocalFile } from "./import-local-file"
import { importSnippet } from "./import-snippet"
import { resolveFilePath } from "lib/runner/resolveFilePath"

async function tryNodeModulesImport(
  importName: string,
  ctx: ExecutionContext,
  depth: number,
  opts: { cwd?: string } = {},
) {
  // Try node_modules/package/index.tsx
  const indexPath = `node_modules/${importName}/index`
  const resolvedIndexPath = resolveFilePath(indexPath, ctx.fsMap, opts.cwd)
  if (resolvedIndexPath) {
    return importLocalFile(resolvedIndexPath, ctx, depth)
  }

  // Try direct node_modules/package.tsx
  const directPath = `node_modules/${importName}`
  const resolvedDirectPath = resolveFilePath(directPath, ctx.fsMap, opts.cwd)
  if (resolvedDirectPath) {
    return importLocalFile(resolvedDirectPath, ctx, depth)
  }

  return null
}

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

  if (importName.startsWith("@tsci/")) {
    return importSnippet(importName, ctx, depth)
  }

  // Finally try node_modules resolution
  if (!importName.startsWith("./") && !importName.startsWith("../")) {
    const nodeModulesResult = await tryNodeModulesImport(
      importName,
      ctx,
      depth,
      opts,
    )
    if (nodeModulesResult !== null) {
      return nodeModulesResult
    }
  }

  throw new Error(
    `Unresolved import "${importName}" ${opts.cwd ? `from directory "${opts.cwd}"` : ""}`,
  )
}
