import { expect, test } from "bun:test"

const fixture = (reexport: string) => ({
  entrypoint: "entrypoint.ts",
  fsMap: {
    "entrypoint.ts": `import { value } from "./index"; if (value !== 42) throw new Error("Missing value");`,
    "index.ts": `${reexport}; export interface LocalProps { name: string }`,
    "leaf.ts": `export interface LeafProps { value: number }; export const value = 42;`,
  },
})

/*
 * Imports the same wildcard-export and interface pattern directly with Bun,
 * bypassing CircuitRunner. This control verifies that the TypeScript is
 * valid and its runtime value survives native module loading, isolating the
 * regression to the evaluator path. Temporary fixture files are removed
 * even if the import or assertion fails.
 */
test("Bun can import the same wildcard-export fixture natively", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises")
  const { tmpdir } = await import("node:os")
  const { join } = await import("node:path")
  const dir = await mkdtemp(join(tmpdir(), "tscircuit-star-export-"))
  try {
    const { fsMap } = fixture('export * from "./leaf"')
    for (const [name, source] of Object.entries(fsMap)) {
      await writeFile(join(dir, name), source)
    }
    const module = await import(join(dir, "index.ts"))
    expect(module.value).toBe(42)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
