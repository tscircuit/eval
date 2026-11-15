import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json exports when it is a string path", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: "./dist/modern.js",
        }),
        "node_modules/test-package/dist/modern.js": `
          export const resistorName = "R12"
          export const resistanceValue = "12k"
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
      (element) =>
        element.type === "source_component" && element.name === "R12",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(12000)
    expect(resistor.name).toBe("R12")
  })

  test("resolves package.json exports fallback arrays", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            ".": [{ import: "./dist/esm/index.js" }, "./dist/fallback.js"],
          },
        }),
        "node_modules/test-package/dist/esm/index.js": `
          export const resistorName = "R12B"
          export const resistanceValue = "12.5k"
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
      (element) =>
        element.type === "source_component" && element.name === "R12B",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(12500)
    expect(resistor.name).toBe("R12B")
  })
})
