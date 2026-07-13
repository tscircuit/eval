/**
 * Given a cwd that lives inside node_modules, return the name of the package
 * that owns that directory (i.e. the package doing the importing). Returns null
 * when cwd is not inside a node_modules directory (e.g. a user project file).
 *
 * Examples:
 * - "node_modules/css-select/lib/pseudo-selectors" -> "css-select"
 * - "node_modules/@tscircuit/image-utils/dist" -> "@tscircuit/image-utils"
 * - "." -> null
 */
export function getImportingPackageName(cwd?: string): string | null {
  if (!cwd) return null

  const nodeModulesMarker = "node_modules/"
  const nodeModulesIndex = cwd.lastIndexOf(nodeModulesMarker)
  if (nodeModulesIndex === -1) return null

  const packagePathParts = cwd
    .slice(nodeModulesIndex + nodeModulesMarker.length)
    .split("/")

  if (packagePathParts[0]?.startsWith("@")) {
    return packagePathParts.length >= 2
      ? `${packagePathParts[0]}/${packagePathParts[1]}`
      : null
  }

  return packagePathParts[0] || null
}
