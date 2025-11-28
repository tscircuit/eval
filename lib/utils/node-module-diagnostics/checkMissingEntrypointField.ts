import type { PackageJson } from "../resolve-node-module"
import {
  getEntrypointPath,
  getModuleDirectoryFilePaths,
  getModulePackageJson,
} from "./helpers"

/**
 * SCENARIO 6: Package.json exists but has no main/module/exports field
 *
 * When a module has files in node_modules and has a package.json, but
 * that package.json doesn't declare any entry point (main/module/exports).
 * The module loader doesn't know which file to use as the entry point.
 */
export function checkMissingEntrypointField(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const modulePackageJson = getModulePackageJson(packageName, fsMap)
  const declaredEntry = getEntrypointPath(modulePackageJson)
  const moduleFilePaths = getModuleDirectoryFilePaths(packageName, fsMap)

  if (moduleFilePaths.length > 0 && !declaredEntry) {
    return `Node module '${packageName}' has no 'main', 'module', or 'exports' field in package.json`
  }

  return null
}
