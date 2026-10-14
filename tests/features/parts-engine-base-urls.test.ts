import { expect, test } from "bun:test"
import { JlcPcbPartsEngine } from "@tscircuit/parts-engine"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { createCircuitWebWorker } from "lib/worker"
import { c11337RawEasyEdaJson } from "tests/fixtures/c11337-raweasy"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

const startPartsApi = () => {
  const requests: URL[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      requests.push(url)
      switch (url.pathname) {
        case "/jlcsearch/resistors/list":
          return Response.json({ resistors: [{ lcsc: 1525 }] })
        case "/jlcsearch/api/search":
          return Response.json({ components: [{ lcsc: 1525, stock: 10 }] })
        case "/datasheet-api/datasheets/get":
          return Response.json({
            datasheet: {
              datasheet_id: "9bb0a071-58c6-42e8-a961-ef7599d141bc",
              chip_name: "TLV70033DDCR",
              pin_attributes: { pin1: { requiresPower: true } },
            },
          })
        default:
          return new Response(null, { status: 404 })
      }
    },
  })
  return { server, requests, origin: `http://127.0.0.1:${server.port}` }
}

for (const mode of ["runner", "worker"] as const) {
  test(`${mode} uses serialized JLC URLs`, async () => {
    const { server, requests, origin } = startPartsApi()
    const configuration = {
      partsEngineOptions: JSON.parse(
        JSON.stringify({ jlcSearchBaseUrl: `${origin}/jlcsearch/` }),
      ),
    }
    const runner =
      mode === "runner"
        ? new CircuitRunner()
        : await createCircuitWebWorker({
            ...configuration,
            webWorkerBlobUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
          })
    try {
      if (runner instanceof CircuitRunner) {
        await runner.setPlatformConfig({ pcbDisabled: true })
        await runner.setPartsEngineOptions(configuration.partsEngineOptions)
      }
      await runner.executeWithFsMap({
        fsMap: {
          "index.tsx": `export default () => (
            <board routingDisabled>
              <resistor name="R1" resistance="10k" footprint="0402" />
            </board>
          )`,
          ...(mode === "worker"
            ? {
                "tscircuit.config.ts":
                  "export default { platformConfig: { pcbDisabled: true, schematicDisabled: true } }",
              }
            : {}),
        },
      })
      await runner.renderUntilSettled()
      const circuitJson = await runner.getCircuitJson()
      expect(
        circuitJson.find((element) => element.type === "source_component"),
      ).toMatchObject({ supplier_part_numbers: { jlcpcb: ["C1525"] } })
      expect(requests.map((url) => url.pathname)).toContain(
        "/jlcsearch/resistors/list",
      )
    } finally {
      await runner.kill()
      await server.stop(true)
    }
  }, 30_000)
}

test("platform options route datasheet enrichment and preserve custom engines", async () => {
  const { server, requests, origin } = startPartsApi()
  const partsEngineOptions = {
    jlcSearchBaseUrl: `${origin}/jlcsearch`,
    datasheetApiBaseUrl: `${origin}/datasheet-api`,
  }
  const platformFetch: NonNullable<PlatformConfig["platformFetch"]> =
    Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = String(input)
        if (url === "https://easyeda.com/api/components/search") {
          return Response.json({
            success: true,
            result: { lists: { lcsc: [c11337RawEasyEdaJson] } },
          })
        }
        if (url.startsWith("https://easyeda.com/api/components/"))
          return Response.json({ success: true, result: c11337RawEasyEdaJson })
        if (url.startsWith("https://modelcdn.tscircuit.com/"))
          return new Response(null, { status: 404 })
        if (!url.startsWith(`${origin}/`))
          throw new Error(`Unexpected request: ${url}`)
        return fetch(input, init)
      },
      { preconnect: () => {} },
    )
  try {
    const { partsEngine } = getPlatformConfig(
      { platformFetch },
      { partsEngineOptions },
    )
    if (!(partsEngine instanceof JlcPcbPartsEngine))
      throw new Error("Expected the default JLC parts engine")
    const circuitJson = await partsEngine.fetchPartCircuitJson({
      supplierPartNumber: "C11337",
      includeDatasheetInformation: true,
    })
    expect(
      circuitJson?.find(
        (element) => element.type === "source_port" && element.pin_number === 1,
      ),
    ).toMatchObject({ requires_power: true })
    expect(requests[0]?.pathname).toBe("/datasheet-api/datasheets/get")
    expect(requests[0]?.searchParams.get("chip_name")).toBe("tlv70033ddcr")
    expect(
      await partsEngine.fetchPartAvailability({
        supplierName: "jlcpcb",
        supplierPartNumber: "C1525",
      }),
    ).toMatchObject({ stock: 10 })
    expect(requests[1]?.pathname).toBe("/jlcsearch/api/search")

    const customEngine = { findPart: async () => ({}) }
    expect(
      getPlatformConfig({ partsEngine: customEngine }, { partsEngineOptions })
        .partsEngine,
    ).toBe(customEngine)
  } finally {
    await server.stop(true)
  }
})
