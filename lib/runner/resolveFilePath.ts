import { normalizeFilePath } from "./normalizeFsMap"
import { dirname } from "lib/utils/dirname"
import type { TsconfigPaths } from "lib/utils/parse-tsconfig-paths"
import { resolveTsconfigPath } from "lib/utils/parse-tsconfig-paths"
import Debug from "debug"

const debug = Debug("tsci:eval:resolve-file-path")

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
  opts: {
    fsMap?: Record<string, string>
    filePaths?: string[]
    cwd?: string
    tsconfigPaths?: TsconfigPaths | null
  },
) => {
  const filePaths = new Set(
    opts.filePaths ?? (opts.fsMap ? Object.keys(opts.fsMap) : []),
  )

  const normalizedFilePathMap = new Map<string, string>()
  for (const filePath of filePaths) {
    normalizedFilePathMap.set(normalizeFilePath(filePath), filePath)
  }

  const extension = ["tsx", "ts", "json", "js", "jsx", "obj", "gltf", "glb"]

  // First, try to resolve using tsconfig paths for non-relative imports
  if (
    !unknownFilePath.startsWith("./") &&
    !unknownFilePath.startsWith("../") &&
    !unknownFilePath.startsWith("/") &&
    opts.tsconfigPaths
  ) {
    debug(`Attempting to resolve "${unknownFilePath}" using tsconfig paths`)
    const possiblePaths = resolveTsconfigPath(
      unknownFilePath,
      opts.tsconfigPaths,
      opts.cwd,
    )

    if (possiblePaths) {
      for (const possiblePath of possiblePaths) {
        const normalizedPath = normalizeFilePath(possiblePath)
        debug(`Checking tsconfig resolved path: ${normalizedPath}`)

        if (normalizedFilePathMap.has(normalizedPath)) {
          debug(`Found match: ${normalizedPath}`)
          return normalizedFilePathMap.get(normalizedPath)!
        }

        // Try with extensions
        for (const ext of extension) {
          const pathWithExt = `${normalizedPath}.${ext}`
          if (normalizedFilePathMap.has(pathWithExt)) {
            debug(`Found match with extension: ${pathWithExt}`)
            return normalizedFilePathMap.get(pathWithExt)!
          }
        }
      }
    }
  }

  // Handle parent directory navigation properly
  const resolvedPath = opts.cwd
    ? resolveRelativePath(unknownFilePath, opts.cwd)
    : unknownFilePath

  if (filePaths.has(resolvedPath)) {
    return resolvedPath
  }

  const normalizedResolvedPath = normalizeFilePath(resolvedPath)

  if (normalizedFilePathMap.has(normalizedResolvedPath)) {
    return normalizedFilePathMap.get(normalizedResolvedPath)!
  }

  // Search for file with a set of different extensions
  for (const ext of extension) {
    const possibleFilePath = `${normalizedResolvedPath}.${ext}`
    if (normalizedFilePathMap.has(possibleFilePath)) {
      return normalizedFilePathMap.get(possibleFilePath)!
    }
  }

  // Check if it's an absolute import (for backwards compatibility)
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
  opts: {
    fsMap?: Record<string, string>
    filePaths?: string[]
    cwd?: string
    tsconfigPaths?: TsconfigPaths | null
  },
) => {
  const resolvedFilePath = resolveFilePath(unknownFilePath, opts)
  if (!resolvedFilePath) {
    const paths = opts.filePaths ?? (opts.fsMap ? Object.keys(opts.fsMap) : [])
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${paths.join(", ")}`,
    )
  }
  return resolvedFilePath
}
