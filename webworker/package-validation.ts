/**
 * Utility functions for package.json validation
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
    // e.g., "@scope/package/subpath" -> "@scope/package"
    // e.g., "lodash/get" -> "lodash"
    let basePackageName = packageName
    if (packageName.startsWith("@")) {
      // Scoped package: @scope/package or @scope/package/subpath
      const parts = packageName.split("/")
      basePackageName =
        parts.length >= 2 ? `${parts[0]}/${parts[1]}` : packageName
    } else {
      // Regular package: package or package/subpath
      basePackageName = packageName.split("/")[0]
    }

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

export function extractBasePackageName(importName: string): string {
  let basePackageName = importName
  if (importName.startsWith("@")) {
    // Scoped package: @scope/package or @scope/package/subpath
    const parts = importName.split("/")
    basePackageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importName
  } else {
    // Regular package: package or package/subpath
    basePackageName = importName.split("/")[0]
  }
  return basePackageName
}

/**
 * Step 2: Check if node_modules directory exists for the package
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

/**
 * Step 3a: Get the entrypoint from package.json (the "main" or "module" field)
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

/**
 * Step 3b: Check if the entrypoint is a TypeScript file
 */
export function isTypeScriptEntrypoint(entrypoint: string | null): boolean {
  if (!entrypoint) return false
  return entrypoint.endsWith(".ts") || entrypoint.endsWith(".tsx")
}

/**
 * Step 4: Check if dist directory exists and has files
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
