import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw: Node module has a typescript entrypoint that is unsupported", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "ts-package": "1.0.0",
          },
        }),
        "index.tsx": `
          import { something } from "ts-package"

          export default () => <div>Test</div>
        `,
        "node_modules/ts-package/package.json": JSON.stringify({
          name: "ts-package",
          version: "1.0.0",
          main: "src/index.ts",
        }),
        "node_modules/ts-package/src/index.ts": `
          export const something = "value"
        `,
      },
    }),
  ).rejects.toThrow(
    /Node module "ts-package" has a typescript entrypoint that is unsupported/,
  )
})
