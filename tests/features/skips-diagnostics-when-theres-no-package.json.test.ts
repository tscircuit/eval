import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("skips diagnostics when there's no package.json", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-lib"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
      },
    }),
  ).rejects.toThrow('Could not fetch "missing-lib" from jsdelivr')
})
