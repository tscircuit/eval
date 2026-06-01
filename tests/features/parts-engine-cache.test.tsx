import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test, beforeEach } from "bun:test"
import type { SourceComponentBase } from "circuit-json"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { cache } from "@tscircuit/parts-engine"

beforeEach(() => {
  cache.clear()
})

test(
  "parts engine caches results to localCacheEngine when provided",
  async () => {
    const cacheStore = new Map<string, string>()
    const getCalls: string[] = []
    const setCalls: Array<{ key: string; value: string }> = []

    const fakeLocalCacheEngine = {
      getItem: (key: string) => {
        getCalls.push(key)
        return cacheStore.get(key) ?? null
      },
      setItem: (key: string, value: string) => {
        setCalls.push({ key, value })
        cacheStore.set(key, value)
      },
    }

    const platformConfig = getPlatformConfig({
      localCacheEngine: fakeLocalCacheEngine,
    })

    const runner = new CircuitRunner({
      platform: platformConfig,
    })

    await runner.execute(`
      circuit.add(
        <board>
          <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
      )
    `)

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()

    const source_component = circuitJson.find(
      (el) => el.type === "source_component",
    ) as SourceComponentBase

    expect(source_component).toBeDefined()
    expect(source_component.supplier_part_numbers?.jlcpcb).toBeDefined()

    expect(getCalls.length).toBeGreaterThan(0)
    expect(setCalls.length).toBeGreaterThan(0)

    const cachedValue = JSON.parse(setCalls[0].value)
    expect(cachedValue.jlcpcb).toBeDefined()

    await runner.kill()
  },
  { timeout: 15000 },
)

test(
  "parts engine returns cached results on subsequent calls",
  async () => {
    const cacheStore = new Map<string, string>()
    let fetchCount = 0

    const fakeCacheKey =
      '{"ftype":"simple_resistor","name":"R1","footprinterString":"0402"}'
    const fakeCacheValue = JSON.stringify({ jlcpcb: ["C12345", "C67890"] })
    cacheStore.set(fakeCacheKey, fakeCacheValue)

    const fakeLocalCacheEngine = {
      getItem: (key: string) => {
        return cacheStore.get(key) ?? null
      },
      setItem: (key: string, value: string) => {
        cacheStore.set(key, value)
      },
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlString = url.toString()
      if (urlString.includes("jlcsearch.tscircuit.com")) {
        fetchCount++
      }
      return originalFetch(url, init)
    }) as typeof fetch

    try {
      const platformConfig = getPlatformConfig({
        localCacheEngine: fakeLocalCacheEngine,
      })

      const runner = new CircuitRunner({
        platform: platformConfig,
      })

      await runner.execute(`
        circuit.add(
          <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `)

      await runner.renderUntilSettled()

      const circuitJson = await runner.getCircuitJson()

      const source_component = circuitJson.find(
        (el) => el.type === "source_component",
      ) as SourceComponentBase

      expect(source_component).toBeDefined()
      expect(fetchCount).toBe(0)

      await runner.kill()
    } finally {
      globalThis.fetch = originalFetch
    }
  },
  { timeout: 15000 },
)

test(
  "parts engine works without localCacheEngine (backward compatibility)",
  async () => {
    const platformConfig = getPlatformConfig()

    const runner = new CircuitRunner({
      platform: platformConfig,
    })

    await runner.execute(`
      circuit.add(
        <board>
          <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
      )
    `)

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()

    const source_component = circuitJson.find(
      (el) => el.type === "source_component",
    ) as SourceComponentBase

    expect(source_component).toBeDefined()
    expect(source_component.supplier_part_numbers?.jlcpcb).toBeDefined()

    await runner.kill()
  },
  { timeout: 15000 },
)

test("parts engine cache handles multiple component types", async () => {
  const cacheStore = new Map<string, string>()
  const setCalls: Array<{ key: string; value: string }> = []

  const fakeLocalCacheEngine = {
    getItem: (key: string) => {
      return cacheStore.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      setCalls.push({ key, value })
      cacheStore.set(key, value)
    },
  }

  const platformConfig = getPlatformConfig({
    localCacheEngine: fakeLocalCacheEngine,
  })

  const runner = new CircuitRunner({
    platform: platformConfig,
  })

  await runner.execute(`
    circuit.add(
      <board>
        <resistor name="R1" resistance="1k" footprint="0402" />
        <capacitor name="C1" capacitance="100uF" footprint="0805" />
      </board>
    )
  `)

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()

  const source_components = circuitJson.filter(
    (el) => el.type === "source_component",
  ) as SourceComponentBase[]

  expect(source_components.length).toBe(2)

  // Should have cached both resistor and capacitor lookups
  expect(setCalls.length).toBeGreaterThanOrEqual(2)

  // Verify different cache keys for different component types
  const keys = setCalls.map((c) => c.key)
  const hasResistor = keys.some((k) => k.includes("simple_resistor"))
  const hasCapacitor = keys.some((k) => k.includes("simple_capacitor"))
  expect(hasResistor).toBe(true)
  expect(hasCapacitor).toBe(true)

  await runner.kill()
})
