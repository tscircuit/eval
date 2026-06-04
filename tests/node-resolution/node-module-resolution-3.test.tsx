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

  test("resolves extensionless re-export named toString from package module entrypoint", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "package.json": JSON.stringify({
          dependencies: {
            "matrix-like-package": "1.0.0",
          },
        }),
        "node_modules/matrix-like-package/package.json": JSON.stringify({
          name: "matrix-like-package",
          module: "src/index.js",
        }),
        "node_modules/matrix-like-package/src/index.js": `
          export * from "./toString"
        `,
        "node_modules/matrix-like-package/src/toString.js": `
          export const resistorName = "R_TO_STRING"
        `,
        "user-code.tsx": `
          import { resistorName } from "matrix-like-package"
          export default () => (<resistor name={resistorName} resistance="1k" />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) =>
        element.type === "source_component" && element.name === "R_TO_STRING",
    )
    expect(resistor).toBeDefined()
  })
})
