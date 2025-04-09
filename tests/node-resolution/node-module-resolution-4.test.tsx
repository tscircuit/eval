import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves scoped package with index file", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/@scope/package/index.js": `
          export const resistorName = "R3"
          export const resistanceValue = "3k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "@scope/package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R3",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(3000)
    expect(resistor.name).toBe("R3")
  })
})
