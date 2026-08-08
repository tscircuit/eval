import { normalizeFilePath } from "./normalizeFsMap"
import { resolveRelativePath } from "lib/utils/resolveRelativePath"
import {
  resolveWithTsconfigPaths,
  type TsConfig,
  resolveWithBaseUrl,
} from "./tsconfigPaths"

const FILE_EXTENSIONS = [
  "tsx",
  "ts",
  "json",
  "js",
  "jsx",
  "obj",
  "gltf",
  "glb",
  "stl",
  "step",
  "stp",
]

const resolveNormalizedFilePath = (
  normalizedPath: string,
  normalizedFilePathMap: Map<string, string>,
) => {
  const exactMatch = normalizedFilePathMap.get(normalizedPath)
  if (exactMatch) return exactMatch

  for (const ext of FILE_EXTENSIONS) {
    const fileMatch = normalizedFilePathMap.get(`${normalizedPath}.${ext}`)
    if (fileMatch) return fileMatch
  }

  const directoryPath = normalizedPath.replace(/\/+$/, "")
  for (const ext of FILE_EXTENSIONS) {
    const indexPath = directoryPath
      ? `${directoryPath}/index.${ext}`
      : `index.${ext}`
    const indexMatch = normalizedFilePathMap.get(indexPath)
    if (indexMatch) return indexMatch
  }

  return null
}

export const resolveFilePath = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd?: string,
  opts: { tsConfig?: TsConfig | null; tsconfigDir?: string } = {},
) => {
  const tsConfig = opts.tsConfig ?? null
  const isRelativeImport =
    unknownFilePath.startsWith("./") || unknownFilePath.startsWith("../")
  const hasBaseUrl = !!tsConfig?.compilerOptions?.baseUrl

  // Handle parent directory navigation properly
  const resolvedPath =
    cwd && (isRelativeImport || !hasBaseUrl)
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

  // When baseUrl is set, non-relative imports should go through baseUrl resolution
  if (isRelativeImport || !hasBaseUrl) {
    const resolvedFilePath = resolveNormalizedFilePath(
      normalizedResolvedPath,
      normalizedFilePathMap,
    )
    if (resolvedFilePath) return resolvedFilePath
  }

  // Try resolving using tsconfig "paths" mapping when the import is non-relative
  if (!isRelativeImport) {
    const resolvedPathFromPaths = resolveWithTsconfigPaths({
      importPath: unknownFilePath,
      normalizedFilePathMap,
      extensions: FILE_EXTENSIONS,
      tsConfig,
      tsconfigDir: opts.tsconfigDir,
    })
    if (resolvedPathFromPaths) return resolvedPathFromPaths

    const resolvedPathFromBaseUrl = resolveWithBaseUrl({
      importPath: unknownFilePath,
      normalizedFilePathMap,
      extensions: FILE_EXTENSIONS,
      tsConfig,
      tsconfigDir: opts.tsconfigDir,
    })
    if (resolvedPathFromBaseUrl) return resolvedPathFromBaseUrl
  }

  // Check if it's an absolute import (only if no baseUrl is configured in tsconfig)
  // When baseUrl is set, imports should resolve via baseUrl or fail, not fall back to absolute paths
  if (!isRelativeImport && !hasBaseUrl) {
    const normalizedUnknownFilePath = normalizeFilePath(unknownFilePath)
    return resolveNormalizedFilePath(
      normalizedUnknownFilePath,
      normalizedFilePathMap,
    )
  }

  return null
}

export const resolveFilePathOrThrow = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd?: string,
  opts: { tsConfig?: TsConfig | null; tsconfigDir?: string } = {},
) => {
  const resolvedFilePath = resolveFilePath(
    unknownFilePath,
    fsMapOrAllFilePaths,
    cwd,
    opts,
  )
  if (!resolvedFilePath) {
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${Object.keys(fsMapOrAllFilePaths).join(", ")}`,
    )
  }
  return resolvedFilePath
}
