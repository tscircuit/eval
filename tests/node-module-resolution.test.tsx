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

  test("resolves package.json module field over main", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "dist/index.js",
          module: "dist/index.esm.js",
        }),
        "node_modules/test-package/dist/index.js": `
          exports.resistorName = "wrong-name"
          exports.resistanceValue = "wrong-value"
        `,
        "node_modules/test-package/dist/index.esm.js": `
          export const resistorName = "F2"
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
      (element) => element.type === "source_component" && element.name === "F2",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(2000)
    expect(resistor.name).toBe("F2")
  })

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
