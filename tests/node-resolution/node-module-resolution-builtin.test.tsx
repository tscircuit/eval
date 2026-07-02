import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution - node builtins", () => {
  test("a package requiring a node builtin (fs) does not break resolution", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "index.js",
        }),
        // Simulates e.g. typescript's watchGuard.js requiring "fs".
        "node_modules/test-package/index.js": `
          const fs = require("fs")
          const path = require("path")
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
  })

  test("user code importing a node builtin directly does not throw", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "user-code.tsx": `
          import fs from "node:fs"
          import path from "path"
          export default () => (<resistor name="R1" resistance="1k" />)
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
  })
})
