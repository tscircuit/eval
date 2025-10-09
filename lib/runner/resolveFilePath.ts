import { normalizeFilePath } from "./normalizeFsMap"
import { dirname } from "lib/utils/dirname"
import { getTsConfigPaths } from "lib/utils/get-ts-config-paths"

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
  opts: { cwd?: string; tsconfigContent?: string } = {},
): string | null => {
  console.log("resolveFilePath", { unknownFilePath, opts })
  const { cwd, tsconfigContent } = opts
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

  const tsconfigPaths = getTsConfigPaths(tsconfigContent)

  if (tsconfigPaths) {
    for (const [alias, paths] of Object.entries(tsconfigPaths)) {
      const aliasRegex = new RegExp(`^${alias.replace("*", "(.*)")}$`)
      const match = unknownFilePath.match(aliasRegex)

      if (match) {
        for (const p of paths) {
          const resolvedAliasPath = p.replace("*", match[1] ?? "")
          let filePath: string | null = null
          filePath = resolveFilePath(resolvedAliasPath, fsMapOrAllFilePaths, {
            ...opts,
            cwd: "", // Don't use cwd for alias resolution
          })
          if (filePath) return filePath
        }
      }
    }
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
  opts: { cwd?: string; tsconfigContent?: string } = {},
) => {
  const resolvedFilePath = resolveFilePath(
    unknownFilePath,
    fsMapOrAllFilePaths,
    opts,
  )
  if (!resolvedFilePath) {
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${Object.keys(
        fsMapOrAllFilePaths,
      ).join(", ")}`,
    )
  }
  return resolvedFilePath
}
