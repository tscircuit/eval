import { expect, test } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { JlcPcbPartsEngine, type PlatformFetch } from "@tscircuit/parts-engine"
import type { PartsEngine } from "@tscircuit/props"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { c11337RawEasyEdaJson } from "tests/fixtures/c11337-raweasy"

const getRequestUrl = (request: Parameters<typeof fetch>[0]): string => {
  if (typeof request === "string") return request
  if (request instanceof URL) return request.href
  return request.url
}

const c11337FixtureFetch: PlatformFetch = async (request) => {
  const requestUrl = getRequestUrl(request)

  if (requestUrl === "https://easyeda.com/api/components/search") {
    return Response.json({
      success: true,
      result: {
        lists: {
          lcsc: [
            {
              uuid: c11337RawEasyEdaJson.uuid,
              dataStr: c11337RawEasyEdaJson.dataStr,
            },
          ],
        },
      },
    })
  }

  if (
    requestUrl.startsWith(
      `https://easyeda.com/api/components/${c11337RawEasyEdaJson.uuid}`,
    )
  ) {
    return Response.json({ success: true, result: c11337RawEasyEdaJson })
  }

  return new Response("Fixture does not provide this resource", {
    status: 404,
  })
}

test("C11337 supplier enrichment preserves an explicit SOT-23-5 footprint", async () => {
  const partsEngine = new JlcPcbPartsEngine({
    platformFetch: c11337FixtureFetch,
  }) as unknown as PartsEngine
  const circuit = new RootCircuit({
    platform: getPlatformConfig({ partsEngine }),
  })

  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U_LDO"
        manufacturerPartNumber="TLV70033DDCR"
        supplierPartNumbers={{ jlcpcb: ["C11337"] }}
        footprint="sot23_5"
        pinLabels={{
          pin1: "IN",
          pin2: "GND",
          pin3: "EN",
          pin4: "NC",
          pin5: "OUT",
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const supplierWarnings = circuitJson.filter(
    (element) =>
      element.type === "source_part_not_found_warning" ||
      element.type === "supplier_footprint_mismatch_warning",
  )
  const sourceComponent = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      "name" in element &&
      element.name === "U_LDO",
  )
  const sourceComponentId =
    sourceComponent && "source_component_id" in sourceComponent
      ? sourceComponent.source_component_id
      : undefined
  const pinNames = circuitJson
    .filter(
      (element) =>
        element.type === "source_port" &&
        element.source_component_id === sourceComponentId,
    )
    .map((element) => ("name" in element ? element.name : undefined))
    .filter((name): name is string => typeof name === "string")
    .sort()

  expect({
    pinNames,
    smtPadCount: circuitJson.filter((element) => element.type === "pcb_smtpad")
      .length,
    supplierWarningMessages: supplierWarnings.map((warning) =>
      warning.message
        .replace(/<chip#\d+/, "<chip#N")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  }).toMatchInlineSnapshot(`
    {
      "pinNames": [
        "EN",
        "GND",
        "IN",
        "NC",
        "OUT",
      ],
      "smtPadCount": 5,
      "supplierWarningMessages": [],
    }
  `)

  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
