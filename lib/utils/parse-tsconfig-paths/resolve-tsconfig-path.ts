import Debug from "debug"
import type { TsconfigPaths } from "./types"

const debug = Debug("tsci:eval:resolve-tsconfig-path")

/**
 * Resolve an import path using tsconfig path mappings
 * @param importPath The import path to resolve (e.g., "@lib/utils")
 * @param tsconfigPaths The parsed tsconfig paths
 * @param cwd Current working directory (relative to project root)
 * @returns Array of possible file paths to try, or null if no match
 */
export function resolveTsconfigPath(
  importPath: string,
  tsconfigPaths: TsconfigPaths | null,
  cwd?: string,
): string[] | null {
  if (!tsconfigPaths?.paths) {
    return null
  }

  const { baseUrl = ".", paths } = tsconfigPaths

  // Find matching path pattern
  for (const [pattern, replacements] of Object.entries(paths)) {
    // Convert tsconfig pattern to regex
    // e.g., "@lib/*" becomes "^@lib/(.*)$"
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, "(.*)")
      .replace(/\$/g, "\\$")

    const regex = new RegExp(`^${regexPattern}$`)
    const match = importPath.match(regex)

    if (match) {
      debug(`Matched pattern "${pattern}" for import "${importPath}"`)

      // Generate possible paths from replacements
      const possiblePaths: string[] = []

      for (const replacement of replacements) {
        let resolvedPath = replacement

        // Replace wildcards with captured groups
        for (let i = 1; i < match.length; i++) {
          resolvedPath = resolvedPath.replace("*", match[i])
        }

        // Apply baseUrl
        if (baseUrl && baseUrl !== ".") {
          resolvedPath = `${baseUrl}/${resolvedPath}`
        }

        // Normalize path (remove leading ./)
        resolvedPath = resolvedPath.replace(/^\.\//, "")

        possiblePaths.push(resolvedPath)
        debug(`Generated possible path: ${resolvedPath}`)
      }

      return possiblePaths
    }
  }

  return null
}
