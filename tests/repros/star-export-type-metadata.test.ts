import { test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

const fixture = (reexport: string) => ({
  entrypoint: "entrypoint.ts",
  fsMap: {
    "entrypoint.ts": `import { value } from "./index"; if (value !== 42) throw new Error("Missing value");`,
    "index.ts": `${reexport}; export interface LocalProps { name: string }`,
    "leaf.ts": `export interface LeafProps { value: number }; export const value = 42;`,
  },
})

/*
 * Reproduces the AM62L export pattern: the leaf exports an interface and a
 * value, and the barrel wildcard-re-exports them while exporting its own
 * interface. Evaluation must succeed without forwarding the leaf's internal
 * __typeOnlyExports__ metadata as a getter-only binding that prevents the
 * barrel from storing its own metadata.
 */
test("wildcard re-export plus a local interface does not collide with type metadata", async () => {
  const runner = new CircuitRunner()
  await runner.executeWithFsMap(fixture('export * from "./leaf"'))
})
