import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("CircuitWebWorker.executeComponent 2", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })

  let testExecScope = "never_executed_outside_worker"
  const MyComponent = () => {
    testExecScope = "executed_outside_worker"
    return (
      <board>
        <resistor name="R1" resistance="1k" />
      </board>
    )
  }

  await worker.executeComponent(<MyComponent />)

  await worker.renderUntilSettled()
  const circuitJson = await worker.getCircuitJson()
  const R1 = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(R1).toBeDefined()

  expect(testExecScope).toBe("executed_outside_worker")

  await worker.kill()
})
