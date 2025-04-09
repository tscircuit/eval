import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test.skip("resolves file with explicit extension", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/index.js": `
          export * from "./resistor.js"
        `,
        "node_modules/test-package/resistor.js": `
          export const resistorName = "R8"
          export const resistanceValue = "8k"
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
      (element) => element.type === "source_component" && element.name === "R8",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(8000)
    expect(resistor.name).toBe("R8")
  })
})
