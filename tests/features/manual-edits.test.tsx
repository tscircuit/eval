import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"
import type { PcbComponent, SourceComponentBase } from "circuit-json"

const example1 = {
  entrypoint: "entrypoint.tsx",
  fsMap: {
    "entrypoint.tsx": `
      const manualEdits = {
        pcb_placements: [
          {
            selector: "R1",
            center: {
              x: 5,
              y: 5
            },
            relative_to: "group_center",
          }
        ],
        edit_events: [],
        manual_trace_hints: []
      };
      
      circuit.add(
      <board width="20mm" height="20mm" 
        manualEdits={manualEdits}
      >
        <resistor name="R1" resistance="10k" footprint="0402" />
      </board>)
    `,
  },
}

const example2 = {
  entrypoint: "entrypoint.tsx",
  fsMap: {
    "entrypoint.tsx": `
      import manualEdits from "./manual-edits.json"
      circuit.add(<board width="20mm" height="20mm" manualEdits={manualEdits}><resistor name="R1" resistance="10k" footprint="0402" /></board>)
    `,
    "manual-edits.json": `
      {
        "pcb_placements": [
          {
            "selector": "R1",
            "center": {
              "x": 5,
              "y": 5
            },
            "relative_to": "group_center"
          }
        ],
        "edit_events": [],
        "manual_trace_hints": []
      }
    `,
  },
}

test("example1: Manual edits in entrypoint.tsx file", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/index.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: example1.fsMap,
    entrypoint: example1.entrypoint,
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const R1 = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "R1",
  ) as SourceComponentBase

  const pcb_component = circuitJson.find(
    (el: any) =>
      el.type === "pcb_component" &&
      el.source_component_id === R1?.source_component_id,
  ) as PcbComponent

  expect(pcb_component.center.x).toBe(5)
  expect(pcb_component.center.y).toBe(5)

  await circuitWebWorker.kill()
})

test("example2: Manual edits in manual-edits.json file", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/index.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: example2.fsMap,
    entrypoint: example2.entrypoint,
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const R1 = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "R1",
  ) as SourceComponentBase

  const pcb_component = circuitJson.find(
    (el: any) =>
      el.type === "pcb_component" &&
      el.source_component_id === R1?.source_component_id,
  ) as PcbComponent

  expect(pcb_component.center.x).toBe(5)
  expect(pcb_component.center.y).toBe(5)

  await circuitWebWorker.kill()
})
