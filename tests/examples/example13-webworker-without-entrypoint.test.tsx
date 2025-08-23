import { createCircuitWebWorker } from "lib/worker"
import { expect, test } from "bun:test"
import type { SourceSimpleResistor } from "circuit-json"

test("example13-webworker-without-entrypoint", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  try {
    await circuitWebWorker.executeWithFsMap({
      fsMap: {
        "index.tsx": `
          export default () => (<resistor name="R1" resistance="1k" />)
        `,
      },
    })

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()

    const resistor = circuitJson.find(
      (el: any) => el.type === "source_component" && el.name === "R1",
    ) as SourceSimpleResistor

    expect(resistor).toBeDefined()
    expect(resistor?.resistance).toBe(1000)
  } finally {
    await circuitWebWorker.kill()
  }
})
