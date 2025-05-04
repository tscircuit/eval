import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should render single component from FSMap", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="E1" />
  </board>
);

        `,
      "myled.tsx": `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="F1" />
  </board>
);

        `,
    },
    mainComponentPath: "myled.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson.filter((el: any) => el.name === "F1")).toHaveLength(1)
})
