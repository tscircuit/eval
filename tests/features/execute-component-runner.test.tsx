import { expect, test } from "bun:test"
import * as React from "react"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("CircuitRunner.executeComponent with React element", async () => {
  const runner = new CircuitRunner()
  const element = React.createElement(
    "board",
    { width: "10mm", height: "10mm" },
    React.createElement("resistor", {
      name: "R1",
      resistance: "1k",
      footprint: "0402",
    }),
  )

  await runner.executeComponent(element)
  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()
  const r1 = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(r1).toBeDefined()
  await runner.kill()
})

test("CircuitRunner.executeComponent with factory function", async () => {
  const runner = new CircuitRunner()
  await runner.executeComponent(() =>
    React.createElement(
      "board",
      { width: "10mm", height: "10mm" },
      React.createElement("resistor", {
        name: "R2",
        resistance: "2k",
        footprint: "0402",
      }),
    ),
  )
  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()
  const r2 = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R2",
  )
  expect(r2).toBeDefined()
  await runner.kill()
})
