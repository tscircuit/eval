import { normalizeFilePath } from "./normalizeFsMap"
import { dirname } from "lib/utils/dirname"

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
  const extension = ["tsx", "ts", "json", "js", "jsx"]
  for (const ext of extension) {
    const possibleFilePath = `${normalizedResolvedPath}.${ext}`
    if (normalizedFilePathMap.has(possibleFilePath)) {
      return normalizedFilePathMap.get(possibleFilePath)!
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
) => {
  const resolvedFilePath = resolveFilePath(unknownFilePath, fsMapOrAllFilePaths)
  if (!resolvedFilePath) {
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${Object.keys(fsMapOrAllFilePaths).join(", ")}`,
    )
  }
  return resolvedFilePath
}
