import { extractBasePackageName } from "./extractBasePackageName"

/**
 * Check if a package is declared in package.json (dependencies, devDependencies, or peerDependencies)
 */
export function isPackageDeclaredInPackageJson(
  packageName: string,
  fsMap: Record<string, string>,
): boolean {
  const packageJsonContent = fsMap["package.json"]
  if (!packageJsonContent) {
    // No package.json means we can't validate - allow the import
    return true
  }

  try {
    const packageJson = JSON.parse(packageJsonContent)
    const dependencies = packageJson.dependencies || {}
    const devDependencies = packageJson.devDependencies || {}
    const peerDependencies = packageJson.peerDependencies || {}

    // Extract the base package name (handle scoped packages and subpaths)
    const basePackageName = extractBasePackageName(packageName)

    return (
      basePackageName in dependencies ||
      basePackageName in devDependencies ||
      basePackageName in peerDependencies
    )
  } catch {
    // If we can't parse package.json, allow the import
    return true
  }
}
