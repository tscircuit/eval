import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves subpath exports in package.json", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            "./components": "./dist/components/index.js",
            "./utils": "./dist/utils/index.js",
          },
        }),
        "node_modules/test-package/dist/components/index.js": `
          export const resistorName = "R11"
          export const resistanceValue = "11k"
        `,
        "node_modules/test-package/components.js": `
          export const resistorName = "wrong-name"
          export const resistanceValue = "wrong-value"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package/components"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) =>
        element.type === "source_component" && element.name === "R11",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(11000)
    expect(resistor.name).toBe("R11")
  })
})
