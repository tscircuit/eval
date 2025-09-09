import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig"

test("kicad footprint returns cadModel with wrl url", async () => {
  const platform = getPlatformConfig()

  const mockJson: any[] = []
  const originalFetch = globalThis.fetch

  const mockFetch: typeof fetch = async (_url: RequestInfo | URL) =>
    new Response(JSON.stringify(mockJson))
  mockFetch.preconnect = originalFetch.preconnect
  globalThis.fetch = mockFetch

  const kicadLoader = platform.footprintLibraryMap?.kicad
  const result =
    typeof kicadLoader === "function"
      ? await kicadLoader("resistor")
      : undefined

  const typedResult = result as {
    footprintCircuitJson: any[]
    cadModel?: { model_wrl_url: string }
  }

  globalThis.fetch = originalFetch

  expect(typedResult.footprintCircuitJson).toEqual(mockJson)
  expect(typedResult.cadModel).toBeDefined()
  expect(typedResult.cadModel?.model_wrl_url).toBe(
    "https://kicad-mod-cache.tscircuit.com/resistor.wrl",
  )
})
