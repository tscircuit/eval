import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig"

test(
  "kicad footprint load errors include HTTP status and URL",
  async () => {
    const runner = new CircuitRunner()

    await runner.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <chip
          name="U1"
          footprint="kicad:Connector_JST/JST_SH_BM02B-SRSS-TB_1x02_1MP_P1.00mm_Vertical"
        />
      </board>
    )
  `)

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()
    const error = circuitJson.find(
      (el) => el.type === "external_footprint_load_error",
    )

    expect(error).toBeDefined()
    expect((error as any).message).toContain("HTTP 404")
    expect((error as any).message).toContain(
      "https://kicad-mod-cache.tscircuit.com/Connector_JST/JST_SH_BM02B-SRSS-TB_1x02_1MP_P1.00mm_Vertical.circuit.json",
    )

    await runner.kill()
  },
  20 * 1000,
)

test("kicad footprint library includes both WRL and STEP model URLs", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch

  try {
    const platformConfig = getPlatformConfig()
    const kicadLoader = platformConfig.footprintLibraryMap?.kicad as (
      name: string,
    ) => Promise<any>

    const result = await kicadLoader(
      "Connector_JST/JST_SH_BM02B-SRSS-TB_1x02_1MP_P1.00mm_Vertical",
    )

    expect(result.cadModel.wrlUrl).toBe(
      "https://kicad-mod-cache.tscircuit.com/Connector_JST/JST_SH_BM02B-SRSS-TB_1x02_1MP_P1.00mm_Vertical.wrl",
    )
    expect(result.cadModel.stepUrl).toBe(
      "https://kicad-mod-cache.tscircuit.com/Connector_JST/JST_SH_BM02B-SRSS-TB_1x02_1MP_P1.00mm_Vertical.step",
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
