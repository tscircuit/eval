import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"

test("project configuration overrides platform defaults", async () => {
  const runner = new CircuitRunner({
    projectConfig: { projectBaseUrl: "https://example.com/assets" },
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
  expect(circuit.platform?.partsEngine).toBeDefined()

  await runner.kill()
})
