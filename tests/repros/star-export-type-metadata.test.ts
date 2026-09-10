import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

const fixture = (reexport: string) => ({
  entrypoint: "entrypoint.ts",
  fsMap: {
    "entrypoint.ts": `import { value } from "./index"; if (value !== 42) throw new Error("Missing value");`,
    "index.ts": `${reexport}; export interface LocalProps { name: string }`,
    "leaf.ts": `export interface LeafProps { value: number }; export const value = 42;`,
  },
})

test("wildcard re-export plus a local interface does not collide with type metadata", async () => {
  const runner = new CircuitRunner()
  // Regression: currently throws when assigning __typeOnlyExports__.
  await runner.executeWithFsMap(fixture('export * from "./leaf"'))
})

test("explicit named re-export avoids the metadata collision", async () => {
  const runner = new CircuitRunner()
  await runner.executeWithFsMap(fixture('export { value } from "./leaf"'))
})

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
