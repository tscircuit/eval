import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

// enableDebug should cause the circuit to emit debug:logOutput events

test("CircuitRunner emits debug log", async () => {
  const runner = new CircuitRunner()
  const logs: any[] = []
  runner.on("debug:logOutput", (output) => {
    logs.push(output)
  })
  await runner.enableDebug("Group_doInitialPcbTraceRender")
  await runner.execute("circuit.emit('debug:logOutput', 'hi')")
  expect(logs).toContain("hi")
  await runner.kill()
})

test("CircuitWebWorker emits debug log", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })
  const logs: any[] = []
  worker.on("debug:logOutput", (output) => {
    logs.push(output)
  })
  await worker.enableDebug("Group_doInitialPcbTraceRender")
  await worker.execute("circuit.emit('debug:logOutput', 'hi')")
  await new Promise((r) => setTimeout(r, 0))
  expect(logs).toContain("hi")
  await worker.kill()
})
