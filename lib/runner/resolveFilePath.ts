import { normalizeFilePath } from "./normalizeFsMap"
import { dirname } from "lib/utils/dirname"
import { getTsConfig, resolveWithTsconfigPaths } from "./tsconfigPaths"
import { resolveRelativePath } from "lib/utils/resolveRelativePath"

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
  const tsConfig =
    !Array.isArray(fsMapOrAllFilePaths) &&
    typeof fsMapOrAllFilePaths === "object"
      ? getTsConfig(fsMapOrAllFilePaths)
      : null

  if (!unknownFilePath.startsWith("./") && !unknownFilePath.startsWith("../")) {
    const viaTsconfig = resolveWithTsconfigPaths({
      importPath: unknownFilePath,
      normalizedFilePathMap,
      extensions: extension,
      tsConfig,
    })
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
