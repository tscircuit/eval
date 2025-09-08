import { createCircuitWebWorker } from "lib/index"
import { expect, test } from "bun:test"

test("example18-kicad-footprint-server", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    verbose: true,
  })

  await circuitWebWorker.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
          circuit.add(
            <board>
              <resistor name="R1" resistance="1k" footprint="kicad:Resistor_SMD.pretty/R_0402_1005Metric" pcbX={-2} />
              <capacitor name="C1" capacitance="100uF" footprint="0402" pcbX={2} />
              <trace from=".R1 > .pin2" to=".C1 > .pin1" />
            </board>
          )
        `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()


  const pcb_trace = circuitJson.filter((el: any) => el.type === "pcb_trace")
  expect(pcb_trace).toBeDefined()
  expect(pcb_trace.length).toBe(1)

  await circuitWebWorker.kill()
})
