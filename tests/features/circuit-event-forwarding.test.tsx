import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("circuit-web-worker-events", async () => {
  // Track events for verification
  const capturedEvents: string[] = []

  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"
  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" x="5mm" y="5mm" />
    </board>
  )
  `)

  // Listen to events
  circuitWebWorker.on(
    "renderable:renderLifecycle:PcbComponentRender:start",
    (eventData) => {
      capturedEvents.push("pcbComponentRenderStart")
    },
  )

  circuitWebWorker.on(
    "renderable:renderLifecycle:PcbComponentRender:end",
    (eventData) => {
      capturedEvents.push("pcbComponentRenderEnd")
    },
  )

  // Render until settled to trigger events
  await circuitWebWorker.renderUntilSettled()

  // Verify that some expected events were captured
  expect(capturedEvents.length).toBeGreaterThan(0)
  expect(capturedEvents).toContain("pcbComponentRenderStart")
  expect(capturedEvents).toContain("pcbComponentRenderEnd")

  await circuitWebWorker.kill()
})
