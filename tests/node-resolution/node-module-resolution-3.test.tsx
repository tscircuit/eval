import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
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
})
