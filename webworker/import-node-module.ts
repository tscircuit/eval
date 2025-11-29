import { resolveNodeModule } from "lib/utils/resolve-node-module"
import type { ExecutionContext } from "./execution-context"
import { importLocalFile } from "./import-local-file"
import Debug from "debug"
import {
  isPackageDeclaredInPackageJson,
  getNodeModuleDirectory,
  getPackageJsonEntrypoint,
  isTypeScriptEntrypoint,
  isDistDirEmpty,
} from "./package-validation"

const debug = Debug("tsci:eval:import-node-module")

export const importNodeModule = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  const { preSuppliedImports, fsMap } = ctx

  if (preSuppliedImports[importName]) {
    return
  }

  // Only run validation if package.json exists (can't validate without it)
  const hasPackageJson = !!fsMap["package.json"]

  if (hasPackageJson) {
    // Step 1: Check if the package is declared in package.json
    if (!isPackageDeclaredInPackageJson(importName, fsMap)) {
      throw new Error(
        `Node module imported but not in package.json "${importName}"\n\n${ctx.logger.stringifyLogs()}`,
      )
    }
  }

  const resolvedNodeModulePath = resolveNodeModule(importName, ctx.fsMap, "")

  // Only run Steps 2-4 if package exists in node_modules (after resolver attempts)
  if (hasPackageJson && resolvedNodeModulePath) {
    // Step 2: Check if node_modules directory exists for the package
    const nodeModuleDir = getNodeModuleDirectory(importName, fsMap)
    if (!nodeModuleDir) {
      throw new Error(
        `Node module "${importName}" has no files in the node_modules directory\n\n${ctx.logger.stringifyLogs()}`,
      )
    }

    // Step 3: Check if main entrypoint is a TypeScript file
    const entrypoint = getPackageJsonEntrypoint(importName, fsMap)
    if (isTypeScriptEntrypoint(entrypoint)) {
      throw new Error(
        `Node module "${importName}" has a typescript entrypoint that is unsupported\n\n${ctx.logger.stringifyLogs()}`,
      )
    }

    // Step 4: Check if dist directory is empty when main points to dist
    if (entrypoint && entrypoint.startsWith("dist/")) {
      if (isDistDirEmpty(importName, fsMap)) {
        throw new Error(
          `Node module "${importName}" has no files in dist, did you forget to transpile?\n\n${ctx.logger.stringifyLogs()}`,
        )
      }
    }
  }

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
