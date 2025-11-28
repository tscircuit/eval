import { test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("allows modules with index.js even without main/module field in package.json", async () => {
  const runner = new CircuitRunner()

  // Module with index.js but no explicit main/module field should work
  // (resolveNodeModule will find index.js as default)
  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `import pkg from "no-entry-module"
        circuit.add(<board width="1mm" height="1mm" />)
      `,
      "package.json": JSON.stringify({
        name: "test",
        dependencies: { "no-entry-module": "1.0.0" },
      }),
      "node_modules/no-entry-module/package.json": JSON.stringify({
        name: "no-entry-module",
        // Missing: main, module, exports fields - but index.js exists as fallback
      }),
      "node_modules/no-entry-module/index.js": `export const value = 1`,
    },
  })
  // No error expected - index.js is the default fallback
})
