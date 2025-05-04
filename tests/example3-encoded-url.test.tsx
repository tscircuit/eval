import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"
// @ts-ignore
import blobUrl from "dist/blob-url"

test("example3-encoded-worker-url", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: blobUrl,
  })

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

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
