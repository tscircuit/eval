import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("throws when dist directory is empty", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "no-dist"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "no-dist": "1.0.0" },
        }),
        "node_modules/no-dist/package.json": JSON.stringify({
          name: "no-dist",
          main: "dist/index.js",
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module 'no-dist' has no files in dist, did you forget to transpile?",
  )
})
