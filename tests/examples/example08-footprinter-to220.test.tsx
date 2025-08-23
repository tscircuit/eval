import { createCircuitWebWorker } from "lib/index"
import { expect, test } from "bun:test"

test("example8-footprinter-to220", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.execute(`  
    circuit.add(
      <board width="10mm" height="10mm">
        <chip footprint="to220_3" name="U3" pcbX={15} pcbY={0} />
      </board>
    )
    `)

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const pcb_plated_hole = circuitJson.filter(
    (el: any) => el.type === "pcb_plated_hole",
  )
  expect(pcb_plated_hole).toBeDefined()

  const chip = circuitJson.find((el: any) => el.name === "U3")
  expect(chip).toBeDefined()

  await circuitWebWorker.kill()
})
