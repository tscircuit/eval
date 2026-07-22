import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"

test("platform configuration is forwarded to RootCircuit", async () => {
  const runner = new CircuitRunner({ platform: { pcbDisabled: true } })

  await runner.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
  `)

  await runner.renderUntilSettled()
  const circuit = (globalThis as any).__tscircuit_circuit
  expect(circuit.platform?.pcbDisabled).toBe(true)

  const circuitJson = await runner.getCircuitJson()
  expect(circuitJson.length).toBeGreaterThan(0)

  await runner.kill()
})

test("disabled flags from tscircuit.config.json are forwarded to RootCircuit", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    fsMap: {
      "tscircuit.config.json": JSON.stringify({
        mainEntrypoint: "example.tsx",
        pcbDisabled: true,
        schematicDisabled: true,
      }),
      "example.tsx": `
        circuit.add(
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
  })

  const circuit = (globalThis as any).__tscircuit_circuit
  expect(circuit.platform?.pcbDisabled).toBe(true)
  expect(circuit.platform?.schematicDisabled).toBe(true)

  await runner.kill()
})
