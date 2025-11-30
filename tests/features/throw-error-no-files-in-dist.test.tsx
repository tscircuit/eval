import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw: Node module has no files in dist, did you forget to transpile", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "dist-package": "1.0.0",
          },
        }),
        "index.tsx": `
          import { something } from "dist-package"

          export default () => <div>Test</div>
        `,
        "node_modules/dist-package/package.json": JSON.stringify({
          name: "dist-package",
          version: "1.0.0",
          main: "dist/index.js",
        }),
        "node_modules/dist-package/src/index.ts": `
          export const something = "value"
        `,
      },
    }),
  ).rejects.toThrow(
    /Node module "dist-package" has no files in dist, did you forget to transpile\?/,
  )
})
