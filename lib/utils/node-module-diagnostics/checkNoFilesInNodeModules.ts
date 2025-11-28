import { getModuleDirectoryFilePaths } from "./helpers"

/**
 * SCENARIO 2: Module declared but no directory in node_modules
 *
 * When a module is listed in package.json but the actual module directory
 * doesn't exist in node_modules (likely dependency not installed)
 */
export function checkNoFilesInNodeModules(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const moduleFilePaths = getModuleDirectoryFilePaths(packageName, fsMap)

  if (moduleFilePaths.length === 0) {
    return `Node module '${packageName}' has no files in the node_modules directory`
  }

  return null
}
