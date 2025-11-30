import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw: Node module imported but not in package.json", async () => {
  const runner = new CircuitRunner()

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
          import { something } from "undeclared-package"

          export default () => <div>Test</div>
        `,
      },
    }),
  ).rejects.toThrow(
    /Node module imported but not in package\.json "undeclared-package"/,
  )
})
