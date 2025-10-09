import Debug from "debug"
import type { TsconfigPaths } from "./types"
import { removeJsonComments } from "./remove-json-comments"

const debug = Debug("tsci:eval:parse-tsconfig-paths")

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
