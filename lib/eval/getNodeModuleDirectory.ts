import { extractBasePackageName } from "./extractBasePackageName"

/**
 * Check if node_modules directory exists for the package
 */
export function getNodeModuleDirectory(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const basePackageName = extractBasePackageName(packageName)
  const nodeModulePath = `node_modules/${basePackageName}`

  // Check if any files exist under this path in fsMap
  const hasFiles = Object.keys(fsMap).some(
    (path) => path.startsWith(nodeModulePath + "/") || path === nodeModulePath,
  )

  return hasFiles ? nodeModulePath : null
}
