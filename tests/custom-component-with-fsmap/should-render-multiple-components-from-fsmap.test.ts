import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should render multiple components from FSMap", async () => {
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
    <resistor resistance="1k" footprint="0402" name="E2" />
    <resistor resistance="1k" footprint="0402" name="E3" />
    <resistor resistance="1k" footprint="0402" name="E4" />
  </board>
);

        `,
      "myled.tsx": `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="F1" />
    <resistor resistance="1k" footprint="0402" name="F2" />
    <resistor resistance="1k" footprint="0402" name="F3" />
    <resistor resistance="1k" footprint="0402" name="F4" />
  </board>
);

        `,
    },
    mainComponentPath: "myled.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  expect(
    circuitJson.filter((el: any) => el.name?.startsWith("F")),
  ).toHaveLength(4)

  await worker.kill()
})
