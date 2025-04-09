import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test.skip("resolves nested node_modules packages", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/parent-package/package.json": JSON.stringify({
          name: "parent-package",
          main: "index.js",
        }),
        "node_modules/parent-package/index.js": `
          import { nestedResistorName, nestedResistanceValue } from "nested-package"
          export const resistorName = nestedResistorName
          export const resistanceValue = nestedResistanceValue
        `,
        "node_modules/parent-package/node_modules/nested-package/package.json":
          JSON.stringify({
            name: "nested-package",
            main: "index.js",
          }),
        "node_modules/parent-package/node_modules/nested-package/index.js": `
          export const nestedResistorName = "R7"
          export const nestedResistanceValue = "7k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "parent-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R7",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(7000)
    expect(resistor.name).toBe("R7")
  })
})
