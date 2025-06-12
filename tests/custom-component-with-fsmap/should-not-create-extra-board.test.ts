import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should not create extra board when board component is imported", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import Board from "./board.tsx";
export default () => <Board />;
      `,
      "board.tsx": `
export default () => (
  <board name="BOARD1" width="10mm" height="10mm">
    <resistor name="R1" resistance="1k" />
  </board>
);
      `,
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson.filter((el: any) => el.name === "BOARD1")).toHaveLength(1)

  await worker.kill()
})
