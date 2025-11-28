import type { PackageJson } from "../resolve-node-module"
import {
  doesEntrypointExist,
  getEntrypointPath,
  getModulePackageJson,
} from "./helpers"

/**
 * SCENARIO 5: Declared entrypoint doesn't exist
 *
 * When a module's package.json declares a main/module entrypoint that
 * doesn't actually exist in the file system. This commonly happens when
 * the dist folder hasn't been transpiled yet.
 */
export function checkMissingEntrypoint(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const modulePackageJson = getModulePackageJson(packageName, fsMap)
  const declaredEntry = getEntrypointPath(modulePackageJson)

  if (
    declaredEntry &&
    !doesEntrypointExist(packageName, declaredEntry, fsMap)
  ) {
    // Special case: if it mentions dist but dist is empty
    if (declaredEntry.includes("dist/")) {
      return `Node module '${packageName}' has no files in dist, did you forget to transpile?`
    }
    // Otherwise generic missing entrypoint
    return `Node module '${packageName}' has no entry point at '${declaredEntry}'`
  }

  return null
}
