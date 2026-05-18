import { expect, test } from "bun:test"
import type { PartsEngine } from "@tscircuit/props"
import { getPlatformConfig } from "lib/getPlatformConfig"
import jlcpcbC156301FootprintCircuitJson from "tests/fixtures/assets/jlcpcb-C156301-footprint.circuit.json"

test("jlcpcb footprint library map returns cadModel from fetched C156301 circuit json", async () => {
  const mockPartsEngine: PartsEngine = {
    findPart: async () => ({}),
    fetchPartCircuitJson: async ({ supplierPartNumber }) => {
      expect(supplierPartNumber).toBe("C156301")
      return jlcpcbC156301FootprintCircuitJson
    },
  } as PartsEngine

  const platformConfig = getPlatformConfig({
    partsEngine: mockPartsEngine,
  })

  const loadJlcpcbFootprint = platformConfig.footprintLibraryMap?.jlcpcb as (
    partNumber: string,
  ) => Promise<any>
  const result = await loadJlcpcbFootprint("156301")

  expect(result).toBeDefined()
  expect(Array.isArray(result?.footprintCircuitJson)).toBe(true)
  expect(result?.cadModel).toBeDefined()
  expect(
    result?.cadModel && "objUrl" in result.cadModel
      ? result.cadModel.objUrl
      : undefined,
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/assets/C156301.obj?uuid=fixture-c156301",
  )
  expect(
    result?.cadModel && "stepUrl" in result.cadModel
      ? result.cadModel.stepUrl
      : undefined,
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/assets/C156301.step?uuid=fixture-c156301",
  )
})
