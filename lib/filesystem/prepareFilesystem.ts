import { InMemoryFilesystemMap } from "./InMemoryFilesystemMap"

export const prepareFilesystem = (opts: { fsMap?: Record<string, string> }) => {
  const fs = new InMemoryFilesystemMap(opts.fsMap ?? {})
  return { fs, fsMap: fs.getSnapshot() }
}
