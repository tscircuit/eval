import { expect, test } from "bun:test"
import type { PartsEngine } from "@tscircuit/props"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getPlatformConfig } from "lib/getPlatformConfig"
import jlcpcbC156301FootprintCircuitJson from "tests/fixtures/assets/jlcpcb-C156301-footprint.circuit.json"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test(
  "jlcpcb footprint library map renders PCB from fetched C156301 circuit json",
  async () => {
    const mockPartsEngine: PartsEngine = {
      findPart: async () => ({}),
      fetchPartCircuitJson: async ({ supplierPartNumber }) => {
        expect(supplierPartNumber).toBe("C156301")
        return jlcpcbC156301FootprintCircuitJson
      },
    } as PartsEngine

    const runner = new CircuitRunner({
      platform: getPlatformConfig({
        partsEngine: mockPartsEngine,
      }),
    })

    try {
      await runner.execute(`
        circuit.add(
          <board width="20mm" height="20mm">
            <chip name="U1" footprint="jlcpcb:C156301" />
          </board>
        )
      `)

      await runner.renderUntilSettled()

      const circuitJson = await runner.getCircuitJson()
      const loadErrors = circuitJson.filter(
        (el) => el.type === "external_footprint_load_error",
      )
      const smtPads = circuitJson.filter((el) => el.type === "pcb_smtpad")

      expect(loadErrors).toHaveLength(0)
      expect(smtPads).toHaveLength(28)

      expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
        import.meta.path,
      )
    } finally {
      await runner.kill()
    }
  },
  30 * 1000,
)
