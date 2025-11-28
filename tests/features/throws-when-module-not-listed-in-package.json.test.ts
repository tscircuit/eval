import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("throws when module not listed in package.json", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-lib"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: {},
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module imported but not in package.json 'missing-lib'",
  )
})
