import { expect, test } from "bun:test"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { CircuitRunner } from "lib/runner/CircuitRunner"

const TEST_KICAD_MOD = `(footprint "MSP430_Test"
  (layer "F.Cu")
  (attr smd)
  (fp_text reference "REF**" (at 0 -1.5 0) (layer "F.SilkS")
    (effects (font (size 1 1) (thickness 0.15))))
  (fp_text value "MSP430_Test" (at 0 1.5 0) (layer "F.Fab")
    (effects (font (size 1 1) (thickness 0.15))))
  (pad "1" smd rect (at -0.65 0 0) (size 0.5 1.1) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd rect (at 0.65 0 0) (size 0.5 1.1) (layers "F.Cu" "F.Paste" "F.Mask"))
)`

const getFakeTiFootprintCircuitJson = async () => {
  const circuitJson = await parseKicadModToCircuitJson(TEST_KICAD_MOD)
  return Array.isArray(circuitJson) ? circuitJson : [circuitJson]
}

test(
  "projectConfig can add a ti footprint resolver without removing default footprint libraries",
  async () => {
    const fakeTiFootprintCircuitJson = await getFakeTiFootprintCircuitJson()
    const runner = new CircuitRunner({
      projectConfig: {
        footprintLibraryMap: {
          ti: async () => ({
            footprintCircuitJson: fakeTiFootprintCircuitJson,
          }),
        },
      },
    })

    try {
      await runner.execute(`
        circuit.add(
          <board width="20mm" height="20mm">
            <chip name="U1" footprint="ti:MSP430" />
          </board>
        )
      `)

      await runner.renderUntilSettled()

      const circuit = (globalThis as any).__tscircuit_circuit
      const circuitJson = await runner.getCircuitJson()
      const loadErrors = circuitJson.filter(
        (el) => el.type === "external_footprint_load_error",
      )
      const smtPads = circuitJson.filter((el) => el.type === "pcb_smtpad")

      expect(typeof circuit.platform?.footprintLibraryMap?.kicad).toBe(
        "function",
      )
      expect(typeof circuit.platform?.footprintLibraryMap?.jlcpcb).toBe(
        "function",
      )
      expect(typeof circuit.platform?.footprintLibraryMap?.ti).toBe("function")
      expect(loadErrors).toHaveLength(0)
      expect(smtPads.length).toBeGreaterThan(0)
    } finally {
      await runner.kill()
    }
  },
  30 * 1000,
)

test("explicit platform still overrides the default platform instead of merging with projectConfig", async () => {
  const runner = new CircuitRunner({
    platform: {
      pcbDisabled: true,
    },
    projectConfig: {
      projectBaseUrl: "https://example.com/assets",
    },
  })

  try {
    await runner.execute(`
      circuit.add(
        <board width="10mm" height="10mm" />
      )
    `)
    const circuit = (globalThis as any).__tscircuit_circuit

    expect(circuit.platform?.pcbDisabled).toBe(true)
    expect(circuit.platform?.projectBaseUrl).toBeUndefined()
  } finally {
    await runner.kill()
  }
})
