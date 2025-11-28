import type { PackageJson } from "../resolve-node-module"
import { getModuleDirectoryFilePaths, getModulePackageJson } from "./helpers"

/**
 * SCENARIO 3: Module has directory but no package.json
 *
 * When the module directory exists in node_modules but there's no
 * package.json file within it (corrupted or incomplete installation)
 */
export function checkMissingPackageJson(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const modulePackageJson = getModulePackageJson(packageName, fsMap)
  const moduleFilePaths = getModuleDirectoryFilePaths(packageName, fsMap)

  if (modulePackageJson === null && moduleFilePaths.length > 0) {
    return `Node module '${packageName}' has a directory in node_modules but no package.json`
  }

  return null
}
