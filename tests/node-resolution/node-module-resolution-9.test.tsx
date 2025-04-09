import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves directory import with index.js", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/lib/index.js": `
          export const resistorName = "R9"
          export const resistanceValue = "9k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package/lib"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R9",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(9000)
    expect(resistor.name).toBe("R9")
  })
})
