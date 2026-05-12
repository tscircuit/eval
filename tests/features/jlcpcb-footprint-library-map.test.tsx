import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test(
  "jlcpcb footprint library map fetches and renders C2040 footprint data",
  async () => {
    const runner = new CircuitRunner()

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
      console.log(circuitJson)
      const loadErrors = circuitJson.filter(
        (el) => el.type === "external_footprint_load_error",
      )

      expect(loadErrors).toHaveLength(0)

      expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
        import.meta.path,
      )
    } finally {
      await runner.kill()
    }
  },
  30 * 1000,
)
