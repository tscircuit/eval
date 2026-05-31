import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

const TEST_KICAD_ARCHIVE_BASE64 =
  "UEsDBAoAAAAAAJlBv1wAAAAAAAAAAAAAAAAIABwAS2lDQUR2Ni9VVAkAAymgG2opoBtqdXgLAAEE6AMAAAToAwAAUEsDBAoAAAAAAJlBv1wAAAAAAAAAAAAAAAAaABwAS2lDQUR2Ni9mb290cHJpbnRzLnByZXR0eS9VVAkAAymgG2opoBtqdXgLAAEE6AMAAAToAwAAUEsDBBQAAAAIAJlBv1wb9HZpzQAAAMEBAAAvABwAS2lDQUR2Ni9mb290cHJpbnRzLnByZXR0eS9NU1A0MzBfVGVzdC5raWNhZF9tb2RVVAkAAymgG2opoBtqdXgLAAEE6AMAAAToAwAApZDBbsIwDEDvfIXlU4tElGyDH0D0hoTo7lUojqha2ip2EfD1SyOQuu0GvsSOnPfsJK7rpPdVK4DbfPf1qYtvYsEZQNLYG3nATK0HTMcLK+KBz8dYuL4Qugp4cuSpLQlwv8nmcxz7QMPCqCXodILJq6bOIyk8J+eoFA6cLrgTru4EBkzol1NV1i0xg1ZmmYaY6i62Gej3rA/hP19mD6/aensENDguGxYsJSoWWq2CIkoiQQejUebp5MdfjcfOslDMtpZrnFA//lDfgqazH1BLAQIeAwoAAAAAAJlBv1wAAAAAAAAAAAAAAAAIABgAAAAAAAAAEAD9QQAAAABLaUNBRHY2L1VUBQADKaAbanV4CwABBOgDAAAE6AMAAFBLAQIeAwoAAAAAAJlBv1wAAAAAAAAAAAAAAAAaABgAAAAAAAAAEAD9QUIAAABLaUNBRHY2L2Zvb3RwcmludHMucHJldHR5L1VUBQADKaAbanV4CwABBOgDAAAE6AMAAFBLAQIeAxQAAAAIAJlBv1wb9HZpzQAAAMEBAAAvABgAAAAAAAEAAAC0gZYAAABLaUNBRHY2L2Zvb3RwcmludHMucHJldHR5L01TUDQzMF9UZXN0LmtpY2FkX21vZFVUBQADKaAbanV4CwABBOgDAAAE6AMAAFBLBQYAAAAAAwADACMBAADMAQAAAAA="

test(
  "ti footprint library map renders PCB from a built-in TI resolver",
  async () => {
    const archiveBuffer = Buffer.from(TEST_KICAD_ARCHIVE_BASE64, "base64")
    const capturedRequests: Request[] = []

    const runner = new CircuitRunner({
      tiPartsEngineConfig: {
        partnerToken: "secret-token",
        baseUrl: "https://ti-bridge.example.com",
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init)
          capturedRequests.push(request)

          return new Response(archiveBuffer, {
            status: 200,
            headers: {
              "content-type": "application/zip",
            },
          })
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

      expect(typeof circuit.platform?.footprintLibraryMap?.ti).toBe("function")
      expect(loadErrors).toHaveLength(0)
      expect(smtPads.length).toBeGreaterThan(0)
      expect(capturedRequests).toHaveLength(1)

      const request = capturedRequests[0]
      const requestUrl = new URL(request.url)

      expect(request.method).toBe("GET")
      expect(request.headers.get("authorization")).toBe("Bearer secret-token")
      expect(request.headers.get("accept")).toBe("application/zip")
      expect(requestUrl.pathname).toBe("/v1/export/kicad")
      expect(requestUrl.search).toBe("?mpn=MSP430&version=6")
    } finally {
      await runner.kill()
    }
  },
  30 * 1000,
)
