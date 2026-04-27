import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
        }),
        "node_modules/test-package/index.js": `
          export const resistorName = "R1"
          export const resistanceValue = "1k"
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
      (element) => element.type === "source_component" && element.name === "R1",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(1000)
    expect(resistor.name).toBe("R1")
  })

  test("resolves package main entrypoints with leading ./", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "./dist/index.js",
        }),
        "node_modules/test-package/dist/index.js": `
          class Base {}
          class Child extends Base {
            value = 1
            constructor() {
              super(), this.value = 2
            }
          }

          export const resistorName = new Child().value === 2 ? "R2" : "BAD"
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
      (element) => element.type === "source_component" && element.name === "R2",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(2000)
  })
})
