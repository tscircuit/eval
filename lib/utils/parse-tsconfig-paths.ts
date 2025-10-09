import Debug from "debug"

const debug = Debug("tsci:eval:parse-tsconfig-paths")

export interface TsconfigPaths {
  baseUrl?: string
  paths?: Record<string, string[]>
}

/**
 * Parse tsconfig.json from fsMap to extract path mappings
 */
export function parseTsconfigPaths(
  fsMap: Record<string, string>,
): TsconfigPaths | null {
  // Try common tsconfig locations
  const possibleTsconfigPaths = [
    "tsconfig.json",
    "./tsconfig.json",
    "src/tsconfig.json",
    "./src/tsconfig.json",
  ]

  for (const tsconfigPath of possibleTsconfigPaths) {
    const content = fsMap[tsconfigPath]
    if (content) {
      try {
        // Remove comments from JSON (tsconfig allows comments)
        const jsonContent = removeJsonComments(content)
        const tsconfig = JSON.parse(jsonContent)

        const compilerOptions = tsconfig.compilerOptions
        if (!compilerOptions) {
          continue
        }

        const result: TsconfigPaths = {}

        if (compilerOptions.baseUrl) {
          result.baseUrl = compilerOptions.baseUrl
        }

        if (compilerOptions.paths) {
          result.paths = compilerOptions.paths
        }

        debug("Parsed tsconfig paths:", result)
        return result
      } catch (error: any) {
        debug(`Failed to parse tsconfig at ${tsconfigPath}:`, error.message)
      }
    }
  }

  return null
}

/**
 * Remove single-line and multi-line comments from JSON string
 */
function removeJsonComments(jsonString: string): string {
  // Remove single-line comments (// ...)
  let result = jsonString.replace(/\/\/.*$/gm, "")

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, "")

  return result
}

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
