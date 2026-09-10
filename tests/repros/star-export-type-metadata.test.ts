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
 * interface. Evaluation should succeed, but currently the barrel inherits
 * a getter-only __typeOnlyExports__ property and assigning its own metadata
 * throws. This test stays failing until that evaluator bug is fixed.
 */
test("wildcard re-export plus a local interface does not collide with type metadata", async () => {
  const runner = new CircuitRunner()
  await runner.executeWithFsMap(fixture('export * from "./leaf"'))
})

/*
 * Keeps the same exported interfaces and runtime value, but replaces the
 * wildcard export with an explicit named export. This control verifies that
 * the evaluator can load the value when internal type metadata is not
 * forwarded by the barrel. The entrypoint also checks that the value is 42.
 */
test("explicit named re-export avoids the metadata collision", async () => {
  const runner = new CircuitRunner()
  await runner.executeWithFsMap(fixture('export { value } from "./leaf"'))
})
