import { normalizeFilePath } from "lib/runner/normalizeFsMap"

interface TsConfig {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

/**
 * Parse tsconfig.json from fsMap if it exists
 */
export function parseTsConfig(fsMap: Record<string, string>): TsConfig | null {
  const tsconfigPath = normalizeFilePath("tsconfig.json")
  const tsconfigContent = fsMap[tsconfigPath] || fsMap["tsconfig.json"]

  if (!tsconfigContent) {
    return null
  }

  try {
    // Remove comments from JSON (simple approach for // and /* */ comments)
    const cleanedContent = tsconfigContent
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
      .replace(/\/\/.*/g, "") // Remove // comments
    return JSON.parse(cleanedContent) as TsConfig
  } catch (error) {
    console.warn("Failed to parse tsconfig.json:", error)
    return null
  }
}

/**
 * Resolve an import path using tsconfig paths configuration
 * Custom implementation inspired by tsconfig-paths for browser/webworker compatibility
 * @param importPath The import path to resolve (e.g., "@src/utils/helper")
 * @param tsconfig Parsed tsconfig object
 * @param fsMap File system map to check if resolved files exist
 * @param cwd Current working directory (for relative resolution)
 * @returns Resolved file path or null if not found
 */
export function resolveTsconfigPath(
  importPath: string,
  tsconfig: TsConfig | null,
  fsMap: Record<string, string>,
  cwd = "",
): string | null {
  if (!tsconfig?.compilerOptions?.paths) {
    return null
  }

  const { baseUrl = ".", paths } = tsconfig.compilerOptions

  // Normalize the file paths for lookup
  const normalizedFsMap = new Map<string, string>()
  for (const [filePath, content] of Object.entries(fsMap)) {
    normalizedFsMap.set(normalizeFilePath(filePath), filePath)
  }

  // Try each path mapping
  for (const [pattern, mappings] of Object.entries(paths)) {
    // Convert glob pattern to regex
    // e.g., "@src/*" becomes /^@src\/(.*)$/
    const patternRegex = new RegExp(
      `^${pattern.replace(/\*/g, "(.*)").replace(/\//g, "\\/")}$`,
    )
    const match = importPath.match(patternRegex)

    if (match) {
      // Try each mapping for this pattern
      for (const mapping of mappings) {
        // Replace * with the captured group
        let resolvedPath = mapping.replace(/\*/g, match[1] || "")

        // Handle baseUrl
        if (baseUrl && baseUrl !== ".") {
          resolvedPath = `${baseUrl}/${resolvedPath}`
        }

        // Normalize the path
        const normalizedPath = normalizeFilePath(resolvedPath)

        // Try exact match first
        if (normalizedFsMap.has(normalizedPath)) {
          return normalizedFsMap.get(normalizedPath)!
        }

        // Try with common extensions
        const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"]
        for (const ext of extensions) {
          const pathWithExt = normalizeFilePath(`${resolvedPath}${ext}`)
          if (normalizedFsMap.has(pathWithExt)) {
            return normalizedFsMap.get(pathWithExt)!
          }
        }

        // Try as directory with index file
        for (const ext of extensions) {
          const indexPath = normalizeFilePath(`${resolvedPath}/index${ext}`)
          if (normalizedFsMap.has(indexPath)) {
            return normalizedFsMap.get(indexPath)!
          }
        }
      }
    }
  }

  return null
}

/**
 * Get cached tsconfig from execution context or parse it
 */
export function getTsConfig(ctx: {
  fsMap: Record<string, string>
  _cachedTsConfig?: TsConfig | null | false
}): TsConfig | null {
  // Use false to indicate "no tsconfig found" vs undefined "not yet checked"
  if (ctx._cachedTsConfig === undefined) {
    ctx._cachedTsConfig = parseTsConfig(ctx.fsMap) || false
  }
  return ctx._cachedTsConfig || null
}
