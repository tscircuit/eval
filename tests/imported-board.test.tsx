import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

test("no extra board when board component is imported", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
        import BoardComponent from "./board.tsx"
        circuit.add(<BoardComponent />)
      `,
      "board.tsx": `
        import "@tscircuit/core"
        export default () => (
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
    mainComponentPath: "index.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()
  const boards = circuitJson.filter((el: any) => el.type === "pcb_board")
  expect(boards).toHaveLength(1)

  await circuitWebWorker.kill()
})
