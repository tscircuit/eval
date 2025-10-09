import { normalizeFilePath } from "./normalizeFsMap"

type RawTsConfig = {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

export type TsConfigPathsInfo = {
  baseUrl: string
  paths: Record<string, string[]>
}

export function getTsConfig(
  fsMapOrAllFilePaths: Record<string, string> | string[],
): TsConfigPathsInfo | null {
  if (Array.isArray(fsMapOrAllFilePaths)) return null
  const tsconfigContent = fsMapOrAllFilePaths["tsconfig.json"]
  if (!tsconfigContent) return null
  try {
    const parsed = JSON.parse(tsconfigContent) as RawTsConfig
    return parsed?.compilerOptions?.paths
      ? {
          baseUrl: parsed.compilerOptions.baseUrl || ".",
          paths: parsed.compilerOptions.paths,
        }
      : null
  } catch {
    return null
  }
}

export function resolveWithTsconfigPaths(opts: {
  importPath: string
  normalizedFilePathMap: Map<string, string>
  extensions: string[]
  tsConfig: TsConfigPathsInfo | null
}): string | null {
  const { importPath, normalizedFilePathMap, extensions, tsConfig } = opts
  if (!tsConfig) return null
  const { baseUrl, paths } = tsConfig

  const tryResolveCandidate = (candidate: string) => {
    const normalizedCandidate = normalizeFilePath(candidate)
    if (normalizedFilePathMap.has(normalizedCandidate)) {
      return normalizedFilePathMap.get(normalizedCandidate)!
    }
    for (const ext of extensions) {
      const withExt = `${normalizedCandidate}.${ext}`
      if (normalizedFilePathMap.has(withExt)) {
        return normalizedFilePathMap.get(withExt)!
      }
    }
    return null
  }

  for (const [alias, targets] of Object.entries(paths)) {
    // Support patterns like "@src/*" or "utils/*" and also exact matches without "*"
    const hasWildcard = alias.includes("*")
    if (hasWildcard) {
      const [prefix, suffix] = alias.split("*")
      if (
        !importPath.startsWith(prefix) ||
        !importPath.endsWith(suffix || "")
      ) {
        continue
      }
      const starMatch = importPath.slice(
        prefix.length,
        importPath.length - (suffix ? suffix.length : 0),
      )
      for (const target of targets) {
        const replaced = target.replace("*", starMatch)
        const candidate =
          baseUrl && !replaced.startsWith("./") && !replaced.startsWith("/")
            ? `${baseUrl}/${replaced}`
            : replaced
        const resolved = tryResolveCandidate(candidate)
        if (resolved) return resolved
      }
    } else {
      if (importPath !== alias) continue
      for (const target of targets) {
        const candidate =
          baseUrl && !target.startsWith("./") && !target.startsWith("/")
            ? `${baseUrl}/${target}`
            : target
        const resolved = tryResolveCandidate(candidate)
        if (resolved) return resolved
      }
    }
  }

  return null
}
