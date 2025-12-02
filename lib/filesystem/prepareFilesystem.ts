import { normalizeFsMap } from "lib/runner/normalizeFsMap"
import { InMemoryFilesystemMap } from "./InMemoryFilesystemMap"
import { materializeFsMap } from "./materializeFsMap"
import type { FilesystemHandler } from "./types"

export const prepareFilesystem = async (opts: {
  fs?: FilesystemHandler
  fsMap?: Record<string, string>
}) => {
  if (opts.fs) {
    const fsMap = normalizeFsMap(await materializeFsMap(opts.fs))
    return { fs: opts.fs, fsMap }
  }

  const fs = new InMemoryFilesystemMap(opts.fsMap ?? {})
  return { fs, fsMap: fs.getSnapshot() }
}
