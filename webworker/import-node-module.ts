import { resolveNodeModule } from "lib/utils/resolve-node-module"
import type { ExecutionContext } from "./execution-context"
import { importLocalFile } from "./import-local-file"

export const importNodeModule = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) {
    return
  }

  const resolvedNodeModulePath = resolveNodeModule(importName, ctx.fsMap, "")

  if (!resolvedNodeModulePath) {
    throw new Error(`Node module "${importName}" not found`)
  }

  // Use importLocalFile to handle the node module
  await importLocalFile(resolvedNodeModulePath, ctx, depth)

  // Map the original import name to the resolved module's exports
  preSuppliedImports[importName] = preSuppliedImports[resolvedNodeModulePath]

  // Map without node_modules prefix for direct imports
  const unprefixedPath = resolvedNodeModulePath.replace(/^node_modules\//, "")
  preSuppliedImports[unprefixedPath] =
    preSuppliedImports[resolvedNodeModulePath]

  // Handle index files specially
  if (
    resolvedNodeModulePath.endsWith("/index.tsx") ||
    resolvedNodeModulePath.endsWith("/index.ts") ||
    resolvedNodeModulePath.endsWith("/index.js")
  ) {
    const dirPath = resolvedNodeModulePath.replace(/\/index\.(tsx?|js)$/, "")
    const unprefixedDirPath = dirPath.replace(/^node_modules\//, "")
    preSuppliedImports[unprefixedDirPath] =
      preSuppliedImports[resolvedNodeModulePath]

    // Handle scoped packages
    if (unprefixedDirPath.startsWith("@")) {
      const scopeParts = unprefixedDirPath.split("/")
      if (scopeParts.length >= 2) {
        const scopedName = `${scopeParts[0]}/${scopeParts[1]}`
        preSuppliedImports[scopedName] =
          preSuppliedImports[resolvedNodeModulePath]
      }
    }
  }
}
