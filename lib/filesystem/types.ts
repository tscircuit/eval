export type WritableContent = string | ArrayBuffer | Uint8Array | Buffer

export interface FilesystemHandler {
  listFiles: (dir: string) => Promise<string[]>
  readFile: (path: string) => Promise<WritableContent | null | undefined>
  writeFile: (path: string, content: WritableContent) => Promise<void>
  listAllFiles: () => Promise<string[]>
}
