import { expect, test } from "bun:test"
import { CircuitRunner, createCircuitWebWorker } from "lib"
import { getTiBridgeTestServer } from "tests/fixtures/tiBridgeTestServer"

test(
  'CircuitRunner can render footprint="ti:MSP430" when tiBridgeConfig is provided',
  async () => {
    const { url, server, capturedRequests } = await getTiBridgeTestServer()
    const runner = new CircuitRunner({
      tiBridgeConfig: {
        partnerToken: "fake-partner-token",
        baseUrl: url,
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

      const circuitJson = await runner.getCircuitJson()
      const loadErrors = circuitJson.filter(
        (el) => el.type === "external_footprint_load_error",
      )
      const smtPads = circuitJson.filter((el) => el.type === "pcb_smtpad")

      expect(loadErrors).toHaveLength(0)
      expect(smtPads.length).toBeGreaterThan(0)
      expect(capturedRequests).toHaveLength(1)
      expect(capturedRequests[0]?.pathname).toBe("/v1/export/kicad")
      expect(capturedRequests[0]?.search).toBe("?mpn=MSP430&version=6")
      expect(capturedRequests[0]?.headers.get("authorization")).toBe(
        "Bearer fake-partner-token",
      )
    } finally {
      await runner.kill()
      await server.stop(true)
    }
  },
  30 * 1000,
)

test(
  "createCircuitWebWorker forwards tiBridgeConfig to the worker runtime",
  async () => {
    const { url, server, capturedRequests } = await getTiBridgeTestServer()
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
      enableFetchProxy: true,
      tiBridgeConfig: {
        partnerToken: "fake-worker-token",
        baseUrl: url,
      },
    })

    try {
      await worker.execute(`
        circuit.add(
          <board width="20mm" height="20mm">
            <chip name="U1" footprint="ti:MSP430" />
          </board>
        )
      `)

      await worker.renderUntilSettled()

      const circuitJson = await worker.getCircuitJson()
      const smtPads = circuitJson.filter((el) => el.type === "pcb_smtpad")

      expect(smtPads.length).toBeGreaterThan(0)
      expect(capturedRequests).toHaveLength(1)
      expect(capturedRequests[0]?.pathname).toBe("/v1/export/kicad")
      expect(capturedRequests[0]?.search).toBe("?mpn=MSP430&version=6")
      expect(capturedRequests[0]?.headers.get("authorization")).toBe(
        "Bearer fake-worker-token",
      )
    } finally {
      await worker.kill()
      await server.stop(true)
    }
  },
  30 * 1000,
)
