import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("throws when module main points to non-existent file", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-entry-module"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "missing-entry-module": "1.0.0" },
        }),
        "node_modules/missing-entry-module/package.json": JSON.stringify({
          name: "missing-entry-module",
          main: "lib/index.js",
          // Note: lib/index.js doesn't actually exist in fsMap
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module 'missing-entry-module' has no entry point at 'lib/index.js'",
  )
})
