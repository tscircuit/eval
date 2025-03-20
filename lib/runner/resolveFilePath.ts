import { normalizeFilePath } from "./normalizeFsMap"

export const resolveFilePath = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd?: string,
) => {
  const unknownFilePathWithCwd = cwd
    ? `${cwd}/${unknownFilePath.replace(/^\.\//, "")}`
    : unknownFilePath
  const filePaths = new Set(
    Array.isArray(fsMapOrAllFilePaths)
      ? fsMapOrAllFilePaths
      : Object.keys(fsMapOrAllFilePaths),
  )

  if (filePaths.has(unknownFilePathWithCwd)) {
    return unknownFilePathWithCwd
  }

  const normalizedFilePathMap = new Map<string, string>()
  for (const filePath of filePaths) {
    normalizedFilePathMap.set(normalizeFilePath(filePath), filePath)
  }

  const normalizedUnknownFilePath = normalizeFilePath(unknownFilePathWithCwd)

  if (normalizedFilePathMap.has(normalizedUnknownFilePath)) {
    return normalizedFilePathMap.get(normalizedUnknownFilePath)!
  }

  // Search for file with a set of different extensions
  const extension = ["tsx", "ts", "json", "js", "jsx"]
  for (const ext of extension) {
    const possibleFilePath = `${normalizedUnknownFilePath}.${ext}`
    if (normalizedFilePathMap.has(possibleFilePath)) {
      return normalizedFilePathMap.get(possibleFilePath)!
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
