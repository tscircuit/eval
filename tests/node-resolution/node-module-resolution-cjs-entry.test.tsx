import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves a dependency whose main entry is a .cjs CommonJS file", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/cjs-package/package.json": JSON.stringify({
          name: "cjs-package",
          main: "dist/index.cjs",
        }),
        "node_modules/cjs-package/dist/index.cjs": `
          module.exports = {
            resistorName: "R5",
            resistanceValue: "5k",
          }
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "cjs-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )
    const resistor = circuitJson.find(
      (element) => element.type === "source_component",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(5000)
    expect(resistor.name).toBe("R5")
  })
})
