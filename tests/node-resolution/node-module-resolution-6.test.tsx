import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json exports field with conditional exports", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            import: "./dist/esm/index.js",
            require: "./dist/cjs/index.js",
          },
        }),
        "node_modules/test-package/dist/esm/index.js": `
          export const resistorName = "R5"
          export const resistanceValue = "5k"
        `,
        "node_modules/test-package/dist/cjs/index.js": `
          exports.resistorName = "wrong-name"
          exports.resistanceValue = "wrong-value"
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
      (element) => element.type === "source_component" && element.name === "R5",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(5000)
    expect(resistor.name).toBe("R5")
  })
})
