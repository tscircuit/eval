import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("krt-wasm autorouting", async () => {
  expect(
    getPlatformConfig().autorouterMap?.krt?.createAutorouter,
  ).toBeFunction()

  const runner = new CircuitRunner()

  await runner.execute(`
      circuit.add(
        <board autorouter={"krt"}>
          <resistor name="R1" resistance="1k" footprint="0402" />
          <capacitor name="C1" capacitance="100uF" footprint="0805" />
          <trace from=".R1 > .pin2" to=".C1 > .pin1" />
        </board>
      )
    `)

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()

  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )

  await runner.kill()
})
