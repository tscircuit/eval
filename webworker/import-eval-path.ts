import type { ExecutionContext } from "./execution-context"
import { importLocalFile } from "./import-local-file"
import { importSnippet } from "./import-snippet"
import { resolveFilePath } from "lib/runner/resolveFilePath"
import { resolveNodeModule } from "lib/utils/resolve-node-module"
import { importNodeModule } from "./import-node-module"
import { importNpmPackage } from "./import-npm-package"
import {
  getTsConfig,
  matchesTsconfigPathPattern,
} from "lib/runner/tsconfigPaths"
import Debug from "debug"

const debug = Debug("tsci:eval:import-eval-path")

export async function importEvalPath(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
  opts: {
    cwd?: string
  } = {},
) {
  debug("importEvalPath called with:", {
    importName,
    depth,
    opts,
  })

  debug(`${"  ".repeat(depth)}➡️`, importName)
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return
  if (importName.startsWith("./") && preSuppliedImports[importName.slice(2)])
    return

  if (depth > 5) {
    console.log("Max depth for imports reached")
    return
  }

  if (importName.startsWith("/npm/")) {
    const pkgName = importName.replace(/^\/npm\//, "").replace(/\/\+esm$/, "")
    await importNpmPackage(pkgName, ctx, depth)
    const pkg = preSuppliedImports[pkgName]
    if (pkg) {
      preSuppliedImports[importName] = pkg
    }
    return
  }

  const resolvedLocalImportPath = resolveFilePath(
    importName,
    ctx.fsMap,
    opts.cwd,
  )
  if (resolvedLocalImportPath) {
    await importLocalFile(resolvedLocalImportPath, ctx, depth)
    // Map the original import name (which might be a tsconfig path alias) to the resolved module
    if (importName !== resolvedLocalImportPath) {
      preSuppliedImports[importName] =
        preSuppliedImports[resolvedLocalImportPath]
    }
    return
  }

  // Try to resolve from node_modules
  const resolvedNodeModulePath = resolveNodeModule(
    importName,
    ctx.fsMap,
    opts.cwd || "",
  )
  if (resolvedNodeModulePath) {
    return importNodeModule(importName, ctx, depth)
  }

  if (importName.startsWith("@tsci/")) {
    return importSnippet(importName, ctx, depth)
  }

  // Check if this matches a tsconfig path pattern but failed to resolve
  // If so, throw an error instead of falling back to npm
  const tsConfig = getTsConfig(ctx.fsMap)
  if (matchesTsconfigPathPattern(importName, tsConfig)) {
    throw new Error(
      `Import "${importName}" matches a tsconfig path alias but could not be resolved to an existing file${opts.cwd ? ` from directory "${opts.cwd}"` : ""}`,
    )
  }

  if (!importName.startsWith(".") && !importName.startsWith("/")) {
    return importNpmPackage(importName, ctx, depth)
  }

  throw new Error(
    `Unresolved import "${importName}" ${opts.cwd ? `from directory "${opts.cwd}"` : ""}`,
  )
}
