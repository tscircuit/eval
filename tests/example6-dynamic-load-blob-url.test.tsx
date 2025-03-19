import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

// TODO should skip b/c uses network
test.skip("example6-dynamic-load-blob-url", async () => {
  const circuitWebWorker = await createCircuitWebWorker({})

  await circuitWebWorker.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"

  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" />
    </board>
  )
  `)

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  expect(circuitJson).toBeDefined()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")
})
