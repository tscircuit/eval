import { CircuitEvaluator } from "lib"
import { expect, test } from "bun:test"

test("example1-readme-example", async () => {
  const circuitEvaluator = new CircuitEvaluator({
    snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
  })

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

  expect(circuitJson).toBeDefined()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")
})
