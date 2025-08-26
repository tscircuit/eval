import { expect, test } from "bun:test"
import * as React from "react"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("CircuitWebWorker.executeComponent with factory function", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })

  await worker.executeComponent(
    <board>
      <resistor name="R1" resistance="1k" />
    </board>,
  )

  await worker.renderUntilSettled()
  const circuitJson = await worker.getCircuitJson()
  const w1 = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "R1",
  )
  expect(w1).toBeDefined()

  await worker.kill()
})
