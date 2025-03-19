import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("circuitrunner1-readme-example", async () => {
  const circuitRunner = new CircuitRunner()

  await circuitRunner.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"

  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" />
    </board>
  )
  `)

  await circuitRunner.renderUntilSettled()

  const circuitJson = await circuitRunner.getCircuitJson()

  expect(circuitJson).toBeDefined()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")
})
