import { SourceMapConsumer, RawSourceMap } from "source-map"

export async function addSourceLineToError(
  error: Error,
  fsMap: Record<string, string>,
  sourceMaps?: Record<string, RawSourceMap>,
) {
  if (!error || typeof error !== "object") return
  const stack = (error as any).stack as string | undefined
  if (!stack) return

  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  for (const path of Object.keys(fsMap)) {
    const regex = new RegExp(escapeRegExp(path) + ":(\\d+):(\\d+)")
    const match = stack.match(regex)
    if (match) {
      const line = parseInt(match[1], 10)
      let originalLine = line
      if (sourceMaps && sourceMaps[path]) {
        const consumer = await new SourceMapConsumer(sourceMaps[path])
        const pos = consumer.originalPositionFor({ line: line - 6, column: 0 })
        consumer.destroy()
        if (pos && pos.line) {
          originalLine = pos.line
        }
      }
      const lines = fsMap[path].split(/\r?\n/)
      const sourceLine = lines[originalLine - 1]
      if (sourceLine !== undefined) {
        error.message += `\n\n> ${path}:${originalLine}\n> ${sourceLine.trim()}`
      } else {
        error.message += `\n\n> ${path}:${originalLine}`
      }
      break
    }
  }
}
