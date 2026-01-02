import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw: main path was not found, it may not be built", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "missing-main": "1.0.0",
          },
        }),
        "index.tsx": `
          import { something } from "missing-main"

          export default () => <div>Test</div>
        `,
        "node_modules/missing-main/package.json": JSON.stringify({
          name: "missing-main",
          version: "1.0.0",
          main: "dist/index.js",
        }),
        "node_modules/missing-main/dist/other.js": `
          export const something = "value"
        `,
      },
    }),
  ).rejects.toThrow(
    /missing-main's main path \(dist\/index\.js\) was not found, it may not be built/,
  )
})
