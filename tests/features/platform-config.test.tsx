import { getPlatformConfig } from "lib/getPlatformConfig"
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

test("TI footprint resolver is opt-in in getPlatformConfig", () => {
  const defaultPlatform = getPlatformConfig()
  expect(defaultPlatform.footprintLibraryMap?.ti).toBeUndefined()

  const tiPlatform = getPlatformConfig(
    {},
    {
      tiBridgeConfig: {
        partnerToken: "fake-partner-token",
        baseUrl: "http://127.0.0.1:65535",
      },
    },
  )

  expect(typeof tiPlatform.footprintLibraryMap?.ti).toBe("function")
  expect(typeof tiPlatform.footprintLibraryMap?.kicad).toBe("function")
  expect(typeof tiPlatform.footprintLibraryMap?.jlcpcb).toBe("function")
})
