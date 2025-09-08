import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("CircuitWebWorker emits debug log", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })
  const logs: any[] = []
  worker.on("debug:logOutput", (output) => {
    logs.push(output)
  })
  await worker.enableDebug("Group_doInitialSchematicTraceRender")
  await worker.execute(`
    circuit.add(<board>
      <resistor name="R1" resistance="1k" footprint="0402" schX={-2} />
      <resistor name="R2" resistance="1k" footprint="0402" connections={{  pin1: "R1.pin1" }} schX={2} />
    </board>)
  `)

  await worker.renderUntilSettled()

  expect(logs).toHaveLength(1)
  await worker.kill()
})
