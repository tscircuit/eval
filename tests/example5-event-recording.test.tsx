import { expect, test } from "bun:test"
import { CircuitEvaluator } from "lib/index"

test("example5-event-recording", async () => {
  const circuitEvaluator = new CircuitEvaluator()

  const events: any[] = []
  circuitEvaluator.on("renderable:renderLifecycle:anyEvent", (event) => {
    events.push(event)
  })

  await circuitEvaluator.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
    `)

  await circuitEvaluator.renderUntilSettled()

  expect(events.length).toBeGreaterThan(0)
  const initialEventCount = events.length

  // Clear event listeners
  circuitEvaluator.clearEventListeners()

  // Add another component to trigger more events
  await circuitEvaluator.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R2" resistance="2k" footprint="0402" />
      </board>
    )
    `)

  await circuitEvaluator.renderUntilSettled()

  // Verify no new events were recorded after clearing listeners
  expect(events.length).toBe(initialEventCount)
})
