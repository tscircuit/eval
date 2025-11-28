import { test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("allows modules with index.js when no package.json exists", async () => {
  const runner = new CircuitRunner()

  // Module with index.js but no package.json should work
  // (resolveNodeModule will find index.js as default)
  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `import pkg from "broken-module"
        circuit.add(<board width="1mm" height="1mm" />)
      `,
      "package.json": JSON.stringify({
        name: "test",
        dependencies: { "broken-module": "1.0.0" },
      }),
      // Module directory exists with index.js but package.json is missing
      "node_modules/broken-module/index.js": `export const value = 1`,
    },
  })
  // No error expected - index.js is a valid fallback
})
