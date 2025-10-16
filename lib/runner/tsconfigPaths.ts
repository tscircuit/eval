import { normalizeFilePath } from "./normalizeFsMap"

export type TsConfig = {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
    [key: string]: unknown
  }
  extends?: string | string[]
  files?: string[]
  references?: Array<Record<string, unknown>>
  include?: string[]
  exclude?: string[]
  [key: string]: unknown
}

export function getTsConfig(
  fsMapOrAllFilePaths: Record<string, string> | string[],
): TsConfig | null {
  if (Array.isArray(fsMapOrAllFilePaths)) return null
  const tsconfigContent = fsMapOrAllFilePaths["tsconfig.json"]
  if (!tsconfigContent) return null
  try {
    const parsed = JSON.parse(tsconfigContent) as TsConfig
    return parsed
  } catch {
    return null
  }
}

export function resolveWithTsconfigPaths(opts: {
  importPath: string
  normalizedFilePathMap: Map<string, string>
  extensions: string[]
  tsConfig: TsConfig | null
}): string | null {
  const { importPath, normalizedFilePathMap, extensions, tsConfig } = opts
  const paths = tsConfig?.compilerOptions?.paths
  if (!paths) return null
  const baseUrl = tsConfig?.compilerOptions?.baseUrl || "."

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

  const resolvedPathFromBaseUrl = resolveWithBaseUrl({
    importPath,
    normalizedFilePathMap,
    extensions,
    tsConfig,
  })

  if (viaBaseUrl) return viaBaseUrl

  return null
}

export function resolveWithBaseUrl(opts: {
  importPath: string
  normalizedFilePathMap: Map<string, string>
  extensions: string[]
  tsConfig: TsConfig | null
}): string | null {
  const { importPath, normalizedFilePathMap, extensions, tsConfig } = opts
  const baseUrl = tsConfig?.compilerOptions?.baseUrl
  if (!baseUrl) return null

  const filePathToResolve = `${baseUrl}/${importPath}`
  const normalizedFilePath = normalizeFilePath(filePathToResolve)

  if (normalizedFilePathMap.has(normalizedFilePath)) {
    return normalizedFilePathMap.get(normalizedFilePath)!
  }

  for (const ext of extensions) {
    const withExt = `${normalizedFilePath}.${ext}`
    if (normalizedFilePathMap.has(withExt)) {
      return normalizedFilePathMap.get(withExt)!
    }
  }

  return null
}

export function matchesTsconfigPathPattern(
  importPath: string,
  tsConfig: TsConfig | null,
): boolean {
  const paths = tsConfig?.compilerOptions?.paths
  if (!paths) return false

  for (const [alias] of Object.entries(paths)) {
    const hasWildcard = alias.includes("*")
    if (hasWildcard) {
      const [prefix, suffix] = alias.split("*")
      if (importPath.startsWith(prefix) && importPath.endsWith(suffix || "")) {
        return true
      }
    } else {
      if (importPath === alias) return true
    }
  }

  return false
}
