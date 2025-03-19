export function normalizeFilePath(filePath: string) {
  let normFilePath = filePath
  normFilePath = normFilePath.replace(/\\/g, "/")
  normFilePath = normFilePath.trim()
  if (normFilePath.startsWith("./")) {
    normFilePath = normFilePath.slice(2)
  }
  if (normFilePath.startsWith("/")) {
    normFilePath = normFilePath.slice(1)
  }
  return normFilePath
}

export function normalizeFsMap(fsMap: Record<string, string>) {
  const normalizedFsMap: Record<string, string> = {}
  for (const [fsPath, fileContent] of Object.entries(fsMap)) {
    normalizedFsMap[normalizeFilePath(fsPath)] = fileContent
  }
  return normalizedFsMap
}
