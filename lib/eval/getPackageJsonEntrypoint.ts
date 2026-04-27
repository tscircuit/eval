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
    // Prefer the browser build when provided because eval runs in a browser-like
    // environment and many CommonJS main files require Node built-ins.
    return (
      (typeof packageJson.browser === "string" && packageJson.browser) ||
      packageJson.module ||
      packageJson.main ||
      null
    )
  } catch {
    return null
  }
}
