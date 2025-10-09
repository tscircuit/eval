import { dirname } from "./dirname"

/**
 * Resolve an importPath relative to a cwd, supporting ../, ./ and absolute paths.
 */
export function resolveRelativePath(importPath: string, cwd: string): string {
  // Handle parent directory navigation
  if (importPath.startsWith("../")) {
    const parentDir = dirname(cwd)
    return resolveRelativePath(importPath.slice(3), parentDir)
  }
  // Handle current directory
  if (importPath.startsWith("./")) {
    return resolveRelativePath(importPath.slice(2), cwd)
  }
  // Handle absolute path
  if (importPath.startsWith("/")) {
    return importPath.slice(1)
  }
  // Handle relative path
  return `${cwd}/${importPath}`
}
