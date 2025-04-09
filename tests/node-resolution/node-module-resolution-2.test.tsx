import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json main field", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "dist/index.js",
        }),
        "node_modules/test-package/dist/index.js": `
          export const resistorName = "Q1"
          export const resistanceValue = "2k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "Q1",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(2000)
    expect(resistor.name).toBe("Q1")
  })
})
