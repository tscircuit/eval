import { expect, test } from "bun:test"
import { CircuitEvaluator } from "lib"

test("circuit-web-worker-events", async () => {
  // Track events for verification
  const capturedEvents: string[] = []

  const circuitEvaluator = new CircuitEvaluator()

  await circuitEvaluator.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"
  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" x="5mm" y="5mm" />
    </board>
  )
  `)

  // Listen to events
  circuitEvaluator.on(
    "renderable:renderLifecycle:PcbComponentRender:start",
    (eventData) => {
      capturedEvents.push("pcbComponentRenderStart")
    },
  )

  circuitEvaluator.on(
    "renderable:renderLifecycle:PcbComponentRender:end",
    (eventData) => {
      capturedEvents.push("pcbComponentRenderEnd")
    },
  )

  // Render until settled to trigger events
  await circuitEvaluator.renderUntilSettled()

  // Verify that some expected events were captured
  expect(capturedEvents.length).toBeGreaterThan(0)
  expect(capturedEvents).toContain("pcbComponentRenderStart")
  expect(capturedEvents).toContain("pcbComponentRenderEnd")
})
