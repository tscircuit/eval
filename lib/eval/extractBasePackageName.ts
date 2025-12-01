/**
 * Extract the base package name from an import name
 * Handles scoped packages and subpaths
 *
 * Examples:
 * - "@scope/package/subpath" -> "@scope/package"
 * - "lodash/get" -> "lodash"
 * - "react" -> "react"
 */
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
