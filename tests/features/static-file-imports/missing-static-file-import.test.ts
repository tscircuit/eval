import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should render the circuit when a static asset import is missing", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import modelUrl from "./missing-model.obj";

export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" cadModel={{
      objUrl: modelUrl
    }} />
  </board>
);
        `,
      // "missing-model.obj" is intentionally absent from the fsMap
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor).toBeDefined()

  await worker.kill()
})
