import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("autoroutingphase addTestPoints generates probe pads", async () => {
  const circuitRunner = new CircuitRunner()

  await circuitRunner.execute(`
  circuit.add(
    <board width="20mm" height="14mm">
      <chip name="U1" footprint="soic8" pcbX={-4} />
      <resistor name="R1" resistance="10k" footprint="0603" pcbX={5} pcbY={3} />
      <resistor name="R2" resistance="10k" footprint="0603" pcbX={5} pcbY={-3} />
      <trace name="SDA" from="U1.pin1" to="R1.pin1" />
      <trace name="SCL" from="U1.pin8" to="R2.pin1" />
      <autoroutingphase
        reroute
        connections={["U1.pin1", "U1.pin8"]}
        addTestPoints
        testPointLayer="top"
        testPointMaxDetour="3mm"
      />
    </board>
  )
  `)

  await circuitRunner.renderUntilSettled()

  const circuitJson = await circuitRunner.getCircuitJson()

  const testPoints = circuitJson.filter(
    (el: any) =>
      el.type === "source_component" && el.name.startsWith("TP_AUTO_"),
  )
  expect(testPoints).toHaveLength(2)

  await circuitRunner.kill()
})
