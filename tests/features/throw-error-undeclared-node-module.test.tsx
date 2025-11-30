import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw error when importing undeclared dependency from node_modules", async () => {
  const runner = new CircuitRunner()

  // Simulate a project with a package.json that doesn't include "lodash"
  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            // Note: "lodash" is NOT declared here
            "some-other-package": "1.0.0",
          },
        }),
        "index.tsx": `
          import { something } from "lodash"

          export default () => (
            <board width="10mm" height="10mm">
              <resistor name="R1" resistance="1k" />
            </board>
          )
        `,
      },
    }),
  ).rejects.toThrow(/Node module imported but not in package\.json "lodash"/)
})
