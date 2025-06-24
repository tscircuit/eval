import { normalizeFilePath } from "./runner/normalizeFsMap"

export const getPossibleEntrypointComponentPaths = (
  fsMap: Record<string, string>,
): string[] => {
  const normalizedFsMap: Record<string, string> = {}
  for (const [path, content] of Object.entries(fsMap)) {
    normalizedFsMap[normalizeFilePath(path)] = content
  }

  const possible = new Set<string>()

  if ("tscircuit.config.json" in normalizedFsMap) {
    try {
      const config = JSON.parse(normalizedFsMap["tscircuit.config.json"])
      if (typeof config.mainEntrypoint === "string") {
        possible.add(normalizeFilePath(config.mainEntrypoint))
      }
    } catch {
      /* ignore */
    }
  }

  if (normalizedFsMap["index.tsx"]) possible.add("index.tsx")
  if (normalizedFsMap["index.ts"]) possible.add("index.ts")

  const circuitFiles = Object.keys(normalizedFsMap).filter((k) =>
    k.endsWith(".circuit.tsx"),
  )
  for (const file of circuitFiles) {
    possible.add(file)
  }

  const tsxFiles = Object.keys(normalizedFsMap).filter((k) =>
    k.endsWith(".tsx"),
  )
  if (tsxFiles.length === 1) {
    possible.add(tsxFiles[0])
  }

  return Array.from(possible)
}
