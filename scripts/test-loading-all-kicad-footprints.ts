import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { getPlatformConfig } from "../lib/getPlatformConfig"

const KICAD_AUTOCOMPLETE_PATH =
  "node_modules/@tscircuit/props/lib/generated/kicad-autocomplete.ts"

const extractKicadPaths = (source: string): string[] => {
  const typeStart = source.indexOf("export type KicadPath =")
  const typeEnd = source.indexOf("export type KicadAutocompleteStringPath")

  if (typeStart === -1 || typeEnd === -1 || typeEnd <= typeStart) {
    throw new Error("Could not find KicadPath union in kicad-autocomplete.ts")
  }

  const typeBody = source.slice(typeStart, typeEnd)
  const matches = typeBody.matchAll(/"([^"]+)"/g)
  const paths = [...matches].map((match) => match[1])

  return [...new Set(paths)]
}

const runWithConcurrency = async (
  items: string[],
  concurrency: number,
  worker: (item: string) => Promise<void>,
) => {
  let index = 0

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const currentIndex = index
      index += 1

      if (currentIndex >= items.length) {
        return
      }

      await worker(items[currentIndex])
    }
  })

  await Promise.all(workers)
}

const main = async () => {
  const source = await readFile(
    resolve(process.cwd(), KICAD_AUTOCOMPLETE_PATH),
    "utf8",
  )
  const rawPaths = extractKicadPaths(source)
  const footprintNames = rawPaths.filter((path) => !path.endsWith(".md"))

  const platformConfig = getPlatformConfig()
  const kicadLoader = platformConfig.footprintLibraryMap?.kicad

  if (typeof kicadLoader !== "function") {
    throw new Error(
      "Platform config is missing footprintLibraryMap.kicad loader",
    )
  }

  const failures: Array<{ footprintName: string; error: unknown }> = []
  let successes = 0

  console.log(
    `Checking ${footprintNames.length} KiCad footprint names from ${KICAD_AUTOCOMPLETE_PATH}...`,
  )

  await runWithConcurrency(footprintNames, 20, async (footprintName) => {
    try {
      const result = await kicadLoader(footprintName)
      if (!result?.footprintCircuitJson?.length) {
        throw new Error("Loader returned no footprintCircuitJson entries")
      }
      successes += 1
      if (successes % 100 === 0) {
        console.log(
          `Loaded ${successes}/${footprintNames.length} footprints...`,
        )
      }
    } catch (error) {
      failures.push({ footprintName, error })
    }
  })

  console.log(`\nDone. Successes: ${successes}, Failures: ${failures.length}`)

  if (failures.length > 0) {
    console.error("\nFirst 20 failures:")
    for (const failure of failures.slice(0, 20)) {
      const message =
        failure.error instanceof Error
          ? failure.error.message
          : JSON.stringify(failure.error)
      console.error(`- ${failure.footprintName}: ${message}`)
    }
    process.exit(1)
  }
}

await main()
