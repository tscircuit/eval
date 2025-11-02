import { createCircuitWebWorker } from "lib/index"
import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("example21-kicad-footprint-rotation", async () => {
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
                <chip
                  name="J1"
                  footprint="kicad:Connector_Coaxial/SMA_Samtec_SMA-J-P-H-ST-EM1_EdgeMount"
                  pcbX="9mm" pcbY="0mm" pcbRotation="0deg"
                  pinLabels={{ pin1: "RF", pin2: "GND" }}
                />
            </board>
          )
        `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const pcb_component = circuitJson.filter((el: any) => el.type === "pcb_component")
  expect(pcb_component).toMatchInlineSnapshot(`
    [
      {
        "center": {
          "x": 8.75,
          "y": 0,
        },
        "do_not_place": false,
        "height": 7,
        "layer": "top",
        "obstructs_within_bounds": true,
        "pcb_component_id": "pcb_component_0",
        "rotation": 0,
        "source_component_id": "source_component_0",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "pcb_component",
        "width": 3.6999999999999993,
      },
    ]
  `)
  
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )

  await circuitWebWorker.kill()
})
