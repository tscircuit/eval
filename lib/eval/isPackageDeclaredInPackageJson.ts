import { extractBasePackageName } from "./extractBasePackageName"

function getNodeModulePackageRoot(cwd?: string): string | null {
  if (!cwd) return null

  const nodeModulesMarker = "node_modules/"
  const nodeModulesIndex = cwd.lastIndexOf(nodeModulesMarker)
  if (nodeModulesIndex === -1) return null

  const packagePrefix = cwd.slice(
    0,
    nodeModulesIndex + nodeModulesMarker.length,
  )
  const packagePathParts = cwd
    .slice(nodeModulesIndex + nodeModulesMarker.length)
    .split("/")

  const packageName = packagePathParts[0]?.startsWith("@")
    ? packagePathParts.slice(0, 2).join("/")
    : packagePathParts[0]

  return packageName ? `${packagePrefix}${packageName}` : null
}

function isPackageDeclaredInManifest(
  packageName: string,
  packageJsonContent: string | undefined,
): boolean | null {
  if (!packageJsonContent) return null

  try {
    const packageJson = JSON.parse(packageJsonContent)
    const dependencies = packageJson.dependencies || {}
    const devDependencies = packageJson.devDependencies || {}
    const peerDependencies = packageJson.peerDependencies || {}

    const basePackageName = extractBasePackageName(packageName)

    return (
      basePackageName in dependencies ||
      basePackageName in devDependencies ||
      basePackageName in peerDependencies
    )
  } catch {
    return true
  }
}

/**
 * Check if a package is declared in package.json (dependencies, devDependencies, or peerDependencies)
 */
export function isPackageDeclaredInPackageJson(
  packageName: string,
  fsMap: Record<string, string>,
  opts: {
    cwd?: string
  } = {},
): boolean {
  const packageRoot = getNodeModulePackageRoot(opts.cwd)
  const packageManifestResult = packageRoot
    ? isPackageDeclaredInManifest(
        packageName,
        fsMap[`${packageRoot}/package.json`],
      )
    : null

  if (packageManifestResult) return true

  const rootManifestResult = isPackageDeclaredInManifest(
    packageName,
    fsMap["package.json"],
  )

  if (rootManifestResult === null && packageManifestResult === null) {
    // No package.json means we can't validate - allow the import
    return true
  }

  return rootManifestResult === true
}
