import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json exports field with default condition", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            ".": "./dist/modern.js",
          },
        }),
        "node_modules/test-package/dist/modern.js": `
          export const resistorName = "R4"
          export const resistanceValue = "4k"
        `,
        "node_modules/test-package/index.js": `
          export const resistorName = "wrong-name"
          export const resistanceValue = "wrong-value"
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
      (element) => element.type === "source_component",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(4000)
    expect(resistor.name).toBe("R4")
  })
})
