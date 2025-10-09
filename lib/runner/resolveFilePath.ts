import { normalizeFilePath } from "./normalizeFsMap"
import { dirname } from "lib/utils/dirname"

type TsConfig = {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

function getTsconfig(fsMapOrAllFilePaths: Record<string, string> | string[]) {
  if (Array.isArray(fsMapOrAllFilePaths)) return null
  const tsconfigContent = fsMapOrAllFilePaths["tsconfig.json"]
  if (!tsconfigContent) return null
  try {
    const parsed = JSON.parse(tsconfigContent) as TsConfig
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

function resolveWithTsconfigPaths(
  importPath: string,
  normalizedFilePathMap: Map<string, string>,
  extensions: string[],
  tsconfig: { baseUrl: string; paths: Record<string, string[]> } | null,
): string | null {
  if (!tsconfig) return null
  const { baseUrl, paths } = tsconfig

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

function resolveRelativePath(importPath: string, cwd: string): string {
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

export const resolveFilePath = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd?: string,
) => {
  // Handle parent directory navigation properly
  const resolvedPath = cwd
    ? resolveRelativePath(unknownFilePath, cwd)
    : unknownFilePath

  const filePaths = new Set(
    Array.isArray(fsMapOrAllFilePaths)
      ? fsMapOrAllFilePaths
      : Object.keys(fsMapOrAllFilePaths),
  )

  if (filePaths.has(resolvedPath)) {
    return resolvedPath
  }

  const normalizedFilePathMap = new Map<string, string>()
  for (const filePath of filePaths) {
    normalizedFilePathMap.set(normalizeFilePath(filePath), filePath)
  }

  const normalizedResolvedPath = normalizeFilePath(resolvedPath)

  if (normalizedFilePathMap.has(normalizedResolvedPath)) {
    return normalizedFilePathMap.get(normalizedResolvedPath)!
  }

  // Search for file with a set of different extensions
  const extension = ["tsx", "ts", "json", "js", "jsx", "obj", "gltf", "glb"]
  for (const ext of extension) {
    const possibleFilePath = `${normalizedResolvedPath}.${ext}`
    if (normalizedFilePathMap.has(possibleFilePath)) {
      return normalizedFilePathMap.get(possibleFilePath)!
    }
  }

  // Try resolving using tsconfig "paths" mapping when the import is non-relative
  const tsconfig =
    !Array.isArray(fsMapOrAllFilePaths) &&
    typeof fsMapOrAllFilePaths === "object"
      ? getTsconfig(fsMapOrAllFilePaths)
      : null

  if (!unknownFilePath.startsWith("./") && !unknownFilePath.startsWith("../")) {
    const viaTsconfig = resolveWithTsconfigPaths(
      unknownFilePath,
      normalizedFilePathMap,
      extension,
      tsconfig,
    )
    if (viaTsconfig) return viaTsconfig
  }

  // Check if it's an absolute import
  if (!unknownFilePath.startsWith("./") && !unknownFilePath.startsWith("../")) {
    const normalizedUnknownFilePath = normalizeFilePath(unknownFilePath)
    if (normalizedFilePathMap.has(normalizedUnknownFilePath)) {
      return normalizedFilePathMap.get(normalizedUnknownFilePath)!
    }
    for (const ext of extension) {
      const possibleFilePath = `${normalizedUnknownFilePath}.${ext}`
      if (normalizedFilePathMap.has(possibleFilePath)) {
        return normalizedFilePathMap.get(possibleFilePath)!
      }
    }
  }

  return null
}

export const resolveFilePathOrThrow = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
) => {
  const resolvedFilePath = resolveFilePath(unknownFilePath, fsMapOrAllFilePaths)
  if (!resolvedFilePath) {
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${Object.keys(fsMapOrAllFilePaths).join(", ")}`,
    )
  }
  return resolvedFilePath
}
