export function normalizeFsMap(fsMap: Record<string, string>) {
  const normalizedFsMap: Record<string, string> = {}
  for (let [fsPath, fileContent] of Object.entries(fsMap)) {
    fsPath = fsPath.replace(/\\/g, "/")
    fsPath = fsPath.trim()
    if (fsPath.startsWith("./")) {
      fsPath = fsPath.slice(2)
    }
    if (fsPath.startsWith("/")) {
      fsPath = fsPath.slice(1)
    }
    normalizedFsMap[fsPath] = fileContent
  }
  return normalizedFsMap
}
