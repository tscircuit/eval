import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves TypeScript files with .ts extension", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/index.ts": `
          export const resistorName: string = "R10"
          export const resistanceValue: string = "10k"
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
      (element) =>
        element.type === "source_component" && element.name === "R10",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(10000)
    expect(resistor.name).toBe("R10")
  })
})
