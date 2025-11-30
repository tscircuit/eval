import { extractBasePackageName } from "./extractBasePackageName"

/**
 * Get the entrypoint from package.json (the "main" or "module" field)
 */
export function getPackageJsonEntrypoint(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const basePackageName = extractBasePackageName(packageName)
  const packageJsonPath = `node_modules/${basePackageName}/package.json`

  const packageJsonContent = fsMap[packageJsonPath]
  if (!packageJsonContent) return null

  try {
    const packageJson = JSON.parse(packageJsonContent)
    // Try main, module, or exports field (in order of preference)
    return packageJson.main || packageJson.module || null
  } catch {
    return null
  }
}
