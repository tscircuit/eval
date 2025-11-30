import { extractBasePackageName } from "./extractBasePackageName"

/**
 * Check if dist directory exists and has files
 */
export function isDistDirEmpty(
  packageName: string,
  fsMap: Record<string, string>,
): boolean {
  const basePackageName = extractBasePackageName(packageName)
  const distPath = `node_modules/${basePackageName}/dist`

  // Check if any files exist under dist/
  const hasFiles = Object.keys(fsMap).some((path) =>
    path.startsWith(distPath + "/"),
  )

  return !hasFiles
}
