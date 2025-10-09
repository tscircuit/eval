import { normalizeFilePath } from "lib/runner/normalizeFsMap"
import * as path from "node:path"
import { createMatchPath, type MatchPath } from "tsconfig-paths"

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
 * Uses the tsconfig-paths library as recommended in the Medium article
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

  // Use tsconfig-paths createMatchPath as recommended in the article
  // This provides proper path resolution following TypeScript's module resolution rules
  const absoluteBaseUrl = path.resolve("/", baseUrl)
  const matchPath = createMatchPath(absoluteBaseUrl, paths, ["main"])

  // Custom file existence check using our fsMap
  const fileExists = (location: string): boolean => {
    // Remove leading slash if present for normalization
    const normalizedLocation = normalizeFilePath(
      location.startsWith("/") ? location.slice(1) : location,
    )

    if (normalizedFsMap.has(normalizedLocation)) {
      return true
    }

    // Try with common extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"]
    for (const ext of extensions) {
      const pathWithExt = normalizeFilePath(
        `${normalizedLocation}${ext}`.replace(/^\//, ""),
      )
      if (normalizedFsMap.has(pathWithExt)) {
        return true
      }
    }

    // Try as directory with index file
    for (const ext of extensions) {
      const indexPath = normalizeFilePath(
        `${normalizedLocation}/index${ext}`.replace(/^\//, ""),
      )
      if (normalizedFsMap.has(indexPath)) {
        return true
      }
    }

    return false
  }

  // Try to match the import path against the configured paths
  const matchedPath = matchPath(importPath, undefined, fileExists, [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
  ])

  if (matchedPath) {
    // Return the actual file path from our fsMap
    const normalizedMatched = normalizeFilePath(
      matchedPath.startsWith("/") ? matchedPath.slice(1) : matchedPath,
    )

    if (normalizedFsMap.has(normalizedMatched)) {
      return normalizedFsMap.get(normalizedMatched)!
    }

    // Try with extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"]
    for (const ext of extensions) {
      const pathWithExt = normalizeFilePath(
        `${normalizedMatched}${ext}`.replace(/^\//, ""),
      )
      if (normalizedFsMap.has(pathWithExt)) {
        return normalizedFsMap.get(pathWithExt)!
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexPath = normalizeFilePath(
        `${normalizedMatched}/index${ext}`.replace(/^\//, ""),
      )
      if (normalizedFsMap.has(indexPath)) {
        return normalizedFsMap.get(indexPath)!
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
