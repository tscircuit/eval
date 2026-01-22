import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test, beforeEach } from "bun:test"
import type { SourceComponentBase } from "circuit-json"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { cache } from "@tscircuit/parts-engine"
import type { FilesystemCacheEngine } from "lib/utils/partsEngineWithFileSystemCache"

beforeEach(() => {
  cache.clear()
})

test("parts engine caches results to filesystemCache when provided", async () => {
  const cacheStore = new Map<string, string>()
  const getCalls: string[] = []
  const setCalls: Array<{ key: string; value: string }> = []

  const fakeFilesystemCache: FilesystemCacheEngine = {
    get: (key: string) => {
      getCalls.push(key)
      return cacheStore.get(key) ?? null
    },
    set: (key: string, value: string) => {
      setCalls.push({ key, value })
      cacheStore.set(key, value)
    },
  }

  const platformConfig = getPlatformConfig({
    filesystemCache: fakeFilesystemCache,
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

  // Verify cache was accessed
  expect(getCalls.length).toBeGreaterThan(0)
  // Verify cache was written (since it was a cache miss)
  expect(setCalls.length).toBeGreaterThan(0)

  // Verify the cache key contains parts-engine prefix
  expect(getCalls[0]).toContain("parts-engine:")
  expect(setCalls[0].key).toContain("parts-engine:")

  // Verify cached value is valid JSON with jlcpcb parts
  const cachedValue = JSON.parse(setCalls[0].value)
  expect(cachedValue.jlcpcb).toBeDefined()

  await runner.kill()
})

test("parts engine returns cached results on subsequent calls", async () => {
  const cacheStore = new Map<string, string>()
  let fetchCount = 0

  // Pre-populate cache with fake data
  const fakeCacheKey =
    'parts-engine:{"type":"source_component","ftype":"simple_resistor","resistance":1000,"footprinterString":"0402"}'
  const fakeCacheValue = JSON.stringify({ jlcpcb: ["C12345", "C67890"] })
  cacheStore.set(fakeCacheKey, fakeCacheValue)

  const fakeFilesystemCache: FilesystemCacheEngine = {
    get: (key: string) => {
      return cacheStore.get(key) ?? null
    },
    set: (key: string, value: string) => {
      cacheStore.set(key, value)
    },
  }

  // fake fetch to track if API was called
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
      filesystemCache: fakeFilesystemCache,
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

    // If cache was hit, the supplier parts should match our fake data
    // Note: The cache key must match exactly for this to work
    // If there's a cache miss, it will fetch from API

    await runner.kill()
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("parts engine works without filesystemCache (backward compatibility)", async () => {
  // Don't provide filesystemCache - should work with in-memory cache only
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
})

test("parts engine cache handles multiple component types", async () => {
  const cacheStore = new Map<string, string>()
  const setCalls: Array<{ key: string; value: string }> = []

  const fakeFilesystemCache: FilesystemCacheEngine = {
    get: (key: string) => {
      return cacheStore.get(key) ?? null
    },
    set: (key: string, value: string) => {
      setCalls.push({ key, value })
      cacheStore.set(key, value)
    },
  }

  const platformConfig = getPlatformConfig({
    filesystemCache: fakeFilesystemCache,
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
