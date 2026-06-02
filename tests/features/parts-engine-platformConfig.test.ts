import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test, expect } from "bun:test"
import type { SourceComponentBase } from "circuit-json"

test("parts engine can be overridden via platform config", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    fsMap: {
      "example.tsx": `
			circuit.add(
                <board width="10mm" height="10mm">
                    <resistor name="R1" resistance="1k" 
                        footprint="ti:0402"
                    />
                </board>
			)
			`,
      "tscircuit.config.json": `
            {
                "mainEntrypoint": "example.tsx",
                "prebuildCommand": "bun test"
            }
        `,
      "tscircuit.config.ts": `
            export default {
                platformConfig: {
                    partsEngine: {
                        findPart: async () => ({ ti: ["C987654"] }),
                        fetchPartCircuitJson: async ({ supplierPartNumber }) => {
                            return [{
                                "type": "pcb_smtpad",
                                "pcb_smtpad_id": "pcb_smtpad_23",
                                "shape": "rect",
                                "pcb_component_id": "pcb_component_0",
                                "port_hints": ["23"],
                                "x": 0,
                                "y": 2,
                                "width": 0.32,
                                "height": 1.1,
                                "layer": "top",
                                "rotation": 0
                            }]
                        }
                    }
                }
            }
        `,
    },
  })

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()
  const sourceComponent = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "R1",
  ) as SourceComponentBase

  // @ts-expect-error - ti is a valid supplier name
  expect(sourceComponent.supplier_part_numbers?.ti).toEqual(["C987654"])
  await runner.kill()
})
