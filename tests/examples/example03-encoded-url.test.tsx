import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"
// @ts-ignore
import blobUrl from "../../dist/blob-url"

test("example3-encoded-worker-url", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: blobUrl,
  })

  await circuitWebWorker.execute(`
  circuit.add(
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
    </board>
  )
  `)

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor).toBeDefined()
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
