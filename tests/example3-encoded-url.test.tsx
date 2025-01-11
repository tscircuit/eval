import { expect, test } from "bun:test"
import { CircuitEvaluator } from "lib"

test("example3-encoded-worker-url", async () => {
  const circuitEvaluator = new CircuitEvaluator()

  await circuitEvaluator.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"

  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" />
    </board>
  )
  `)

  await circuitEvaluator.renderUntilSettled()

  const circuitJson = await circuitEvaluator.getCircuitJson()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")
})
