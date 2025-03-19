import { test, expect } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

test("example5-event-recording", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  const events: any[] = []
  circuitWebWorker.on("renderable:renderLifecycle:anyEvent", (event) => {
    events.push(event)
  })

  await circuitWebWorker.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
    `)

  await circuitWebWorker.renderUntilSettled()

  expect(events.length).toBeGreaterThan(0)
  const initialEventCount = events.length

  // Clear event listeners
  circuitWebWorker.clearEventListeners()

  // Add another component to trigger more events
  await circuitWebWorker.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R2" resistance="2k" footprint="0402" />
      </board>
    )
    `)

  await circuitWebWorker.renderUntilSettled()

  // Verify no new events were recorded after clearing listeners
  expect(events.length).toBe(initialEventCount)
})
