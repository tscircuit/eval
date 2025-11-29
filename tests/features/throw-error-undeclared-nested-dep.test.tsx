import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw error when nested import uses undeclared dependency", async () => {
  const runner = new CircuitRunner()

  // Simulate the exact scenario from the issue:
  // index.tsx -> entrypoint.tsx -> adom-library (not in package.json)
  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {},
        }),
        "index.tsx": `
          import Component from "./entrypoint"
          export default Component
        `,
        "entrypoint.tsx": `
          import { something } from "adom-library"
          
          export default () => (
            <board width="10mm" height="10mm">
              <resistor name="R1" resistance="1k" />
            </board>
          )
        `,
      },
    }),
  ).rejects.toThrow(
    /Node module imported but not in package\.json "adom-library"/,
  )
})
