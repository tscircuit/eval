import { resolveNodeModule } from "lib/utils/resolve-node-module"
import type { ExecutionContext } from "./execution-context"
import { importLocalFile } from "./import-local-file"
import Debug from "debug"

const debug = Debug("tsci:eval:import-node-module")

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
    const platform = ctx.circuit?.platform
    if (platform?.nodeModulesResolver) {
      debug(`Attempting to resolve "${importName}" using nodeModulesResolver`)

      try {
        const fileContent = await platform.nodeModulesResolver(importName)

        if (fileContent) {
          debug(`Successfully resolved "${importName}" via nodeModulesResolver`)

          // Add the resolved content to fsMap with a synthetic path
          // Add .ts extension to ensure it's treated as a module file
          const syntheticPath = `node_modules/${importName}.ts`
          ctx.fsMap[syntheticPath] = fileContent

          // Import the file using the normal flow
          await importLocalFile(syntheticPath, ctx, depth)

          // Map the import name to the resolved module
          preSuppliedImports[importName] = preSuppliedImports[syntheticPath]

          // Also map without node_modules prefix
          const unprefixedPath = syntheticPath.replace(/^node_modules\//, "")
          preSuppliedImports[unprefixedPath] = preSuppliedImports[syntheticPath]

          return
        }

        debug(`nodeModulesResolver returned null for "${importName}"`)
      } catch (error) {
        debug(`nodeModulesResolver failed for "${importName}":`, error)
      }
    }

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
