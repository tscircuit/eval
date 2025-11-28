import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("throws when dependency entrypoint is typescript", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "ts-entry"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "ts-entry": "1.0.0" },
        }),
        "node_modules/ts-entry/package.json": JSON.stringify({
          name: "ts-entry",
          main: "index.ts",
        }),
        "node_modules/ts-entry/index.ts": `export const value = 1`,
      },
    }),
  ).rejects.toThrow(
    "Node module 'ts-entry' has a typescript entrypoint that is unsupported",
  )
})
