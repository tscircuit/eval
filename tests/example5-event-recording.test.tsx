import { test, expect } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

test("example5-event-recording", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  let eventCount = 0
  circuitWebWorker.on("board:renderPhaseStarted", (event) => {
    eventCount++
  })

  await circuitWebWorker.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
    `)

  await circuitWebWorker.renderUntilSettled()

  expect(eventCount).toBeGreaterThan(0)
  const initialEventCount = eventCount

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
  expect(eventCount).toBe(initialEventCount)
})
