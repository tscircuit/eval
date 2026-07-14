import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("ambient-sel: `sel` is usable without importing it from tscircuit", async () => {
  const circuitRunner = new CircuitRunner()

  // Note: `sel` is used here as a bare identifier without any import, just like
  // `circuit`. Previously this threw `ReferenceError: sel is not defined`.
  await circuitRunner.execute(`
  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="1k" footprint="0402" />
      <capacitor name="C1" capacitance="1uF" footprint="0402" connections={{ pin1: sel.R1.pin2 }} />
    </board>
  )
  `)

  const circuitJson = await circuitRunner.getCircuitJson()
  expect(circuitJson).toBeDefined()

  // The selector-based connection should have produced a source trace between
  // C1.pin1 and R1.pin2.
  const sourceTrace = circuitJson.find((el: any) => el.type === "source_trace")
  expect(sourceTrace).toBeDefined()

  await circuitRunner.kill()
})

test('ambient-sel: explicit `import { sel } from "tscircuit"` still works', async () => {
  const circuitRunner = new CircuitRunner()

  await circuitRunner.execute(`
  import { sel } from "tscircuit"

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="1k" footprint="0402" />
      <capacitor name="C1" capacitance="1uF" footprint="0402" connections={{ pin1: sel.R1.pin2 }} />
    </board>
  )
  `)

  const circuitJson = await circuitRunner.getCircuitJson()
  const sourceTrace = circuitJson.find((el: any) => el.type === "source_trace")
  expect(sourceTrace).toBeDefined()

  await circuitRunner.kill()
})
