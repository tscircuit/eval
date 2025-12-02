import { normalizeFilePath } from "lib/runner/normalizeFsMap"
import type { FilesystemHandler, WritableContent } from "./types"

const toUint8Array = (content: Exclude<WritableContent, string>) => {
  if (content instanceof Uint8Array) return content
  if (typeof Buffer !== "undefined" && content instanceof Buffer) {
    return new Uint8Array(content)
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content)
  }
  return new Uint8Array(content)
}

const toStringContent = (content: WritableContent) => {
  if (typeof content === "string") return content
  return new TextDecoder().decode(toUint8Array(content))
}

export const materializeFsMap = async (fs: FilesystemHandler) => {
  const fsMap: Record<string, string> = {}

  const allFiles = await fs.listAllFiles()
  for (const filePath of allFiles) {
    const fileContent = await fs.readFile(filePath)
    if (fileContent === null || fileContent === undefined) continue
    fsMap[normalizeFilePath(filePath)] = toStringContent(fileContent)
  }

  return fsMap
}
