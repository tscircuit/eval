import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"

test("projectSettings overrides default platform config", async () => {
  const runner = new CircuitRunner({
    projectSettings: {
      projectBaseUrl: "https://example.com/assets",
    },
  })

  await runner.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
  `)

  await runner.renderUntilSettled()
  const circuit = (globalThis as any).__tscircuit_circuit
  expect(circuit.platform?.projectBaseUrl).toBe("https://example.com/assets")
  expect(typeof circuit.platform?.footprintLibraryMap?.kicad).toBe("function")

  await runner.kill()
})
