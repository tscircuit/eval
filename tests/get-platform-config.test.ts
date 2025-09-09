import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig"

test("kicad footprint returns cadModel with wrl url", async () => {
  const platform = getPlatformConfig()

  const mockJson: any[] = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async (url: string) => ({
    json: async () => mockJson,
  })) as any

  const result = await platform.footprintLibraryMap?.kicad?.("resistor")

  globalThis.fetch = originalFetch

  expect(result?.footprintCircuitJson).toEqual(mockJson)
  expect(result?.cadModel).toBeDefined()
  expect(result?.cadModel?.model_wrl_url).toBe(
    "https://kicad-mod-cache.tscircuit.com/resistor.wrl",
  )
})
