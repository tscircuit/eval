import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should import .mjs files from fsMap", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { resistorValue } from "./utils.mjs"

        circuit.add(
          <board width="10mm" height="10mm">
            <resistor resistance={resistorValue} footprint="0402" name="R1" />
          </board>
        )
      `,
      "utils.mjs": `
        export const resistorValue = "10k"
      `,
    },
  })

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()
  const resistor = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(resistor).toBeDefined()
})

test("should import .mjs files from node_modules", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { helper } from "my-esm-package"

        circuit.add(
          <board width="10mm" height="10mm">
            <resistor resistance={helper()} footprint="0402" name="R1" />
          </board>
        )
      `,
      "node_modules/my-esm-package/package.json": JSON.stringify({
        name: "my-esm-package",
        type: "module",
        main: "index.mjs",
      }),
      "node_modules/my-esm-package/index.mjs": `
        export function helper() {
          return "1k"
        }
      `,
    },
  })

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()
  const resistor = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(resistor).toBeDefined()
})

test("should handle .mjs files with nested imports", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { getValue } from "./lib/main.mjs"

        circuit.add(
          <board width="10mm" height="10mm">
            <resistor resistance={getValue()} footprint="0402" name="R1" />
          </board>
        )
      `,
      "lib/main.mjs": `
        import { baseValue } from "./constants.mjs"

        export function getValue() {
          return baseValue
        }
      `,
      "lib/constants.mjs": `
        export const baseValue = "4.7k"
      `,
    },
  })

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()
  const resistor = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(resistor).toBeDefined()
})
