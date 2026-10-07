import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig/getPlatformConfig"
import type { PlatformConfig } from "@tscircuit/props"

test("default platform engine supports stock and price without enabling browser checks", async () => {
  const requestedUrls: string[] = []
  const platformFetch: NonNullable<PlatformConfig["platformFetch"]> =
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        requestedUrls.push(String(input))
        return Response.json({
          components: [{ lcsc: 1525, stock: 0, price: 0.001 }],
        })
      },
      { preconnect: () => {} },
    )

  for (const options of [
    {},
    { easyEdaProxyConfig: { proxyEndpointUrl: "https://proxy.example/proxy" } },
  ]) {
    const platform = getPlatformConfig({ platformFetch }, options)
    expect(platform.checkAvailability).not.toBe(true)
    expect(typeof platform.partsEngine?.fetchPartAvailability).toBe("function")
    const availability = await platform.partsEngine!.fetchPartAvailability!({
      supplierName: "jlcpcb",
      supplierPartNumber: "C1525",
      platformFetch: platform.platformFetch,
    })
    expect(availability).toMatchObject({
      stock: 0,
      price: 0.001,
      currency: "USD",
    })
  }
  expect(requestedUrls).toHaveLength(2)
  for (const url of requestedUrls) {
    expect(new URL(url).origin).toBe("https://jlcsearch.tscircuit.com")
    expect(new URL(url).searchParams.get("q")).toBe("C1525")
  }

  const customEngine = { findPart: async () => ({}) }
  const overridden = getPlatformConfig({
    partsEngine: customEngine,
    checkAvailability: true,
  })
  expect(overridden.partsEngine).toBe(customEngine)
  expect(overridden.checkAvailability).toBe(true)
})
