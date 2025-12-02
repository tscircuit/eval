import { normalizeFilePath, normalizeFsMap } from "lib/runner/normalizeFsMap"
import type { FilesystemHandler, WritableContent } from "./types"

export class InMemoryFilesystemMap implements FilesystemHandler {
  private map: Record<string, string>

  private normalizeToUint8Array(content: Exclude<WritableContent, string>) {
    if (content instanceof Uint8Array) return content
    if (typeof Buffer !== "undefined" && content instanceof Buffer) {
      return new Uint8Array(content)
    }
    if (content instanceof ArrayBuffer) return new Uint8Array(content)
    return new Uint8Array(content)
  }

  constructor(initialMap: Record<string, string> = {}) {
    this.map = normalizeFsMap(initialMap)
  }

  async listFiles(dir: string): Promise<string[]> {
    const normalizedDir = normalizeFilePath(dir)
    const dirPrefix = normalizedDir ? `${normalizedDir}/` : ""
    return Object.keys(this.map).filter((path) => path.startsWith(dirPrefix))
  }

  async listAllFiles(): Promise<string[]> {
    return Object.keys(this.map)
  }

  async readFile(path: string): Promise<string> {
    const normalizedPath = normalizeFilePath(path)
    const content = this.map[normalizedPath]
    if (content === undefined) {
      throw new Error(`File not found: ${path}`)
    }
    return content
  }

  async writeFile(path: string, content: WritableContent): Promise<void> {
    const normalizedPath = normalizeFilePath(path)
    this.map[normalizedPath] =
      typeof content === "string"
        ? content
        : new TextDecoder().decode(this.normalizeToUint8Array(content))
  }

  getSnapshot() {
    return { ...this.map }
  }
}
