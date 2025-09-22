import { createCircuitWebWorker, runTscircuitCode } from "lib/index"
import { expect, test, beforeEach } from "bun:test"
import type { SourceComponentBase } from "circuit-json"
import { cache } from "@tscircuit/parts-engine"

beforeEach(() => {
  cache.clear()
})

test("example16-jlc-parts-engine with entrypoint", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    verbose: true,
  })

  await circuitWebWorker.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        circuit.add(
          <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
            <capacitor name="C1" capacitance="100uF" footprint="1206" />
          </board>
        )
      `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const source_component = circuitJson.filter(
    (el: any) => el.type === "source_component",
  ) as SourceComponentBase[]
  expect(source_component).toBeDefined()

  const jlcpcb_parts_list = source_component.map(
    (el) => el.supplier_part_numbers?.jlcpcb,
  )
  for (const el of jlcpcb_parts_list) {
    expect(el).toBeDefined()
    expect(el?.length).toBeGreaterThan(0)
  }

  await circuitWebWorker.kill()
})

test("example16-jlc-parts-engine with mainComponentPath", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "user-code.tsx": `
        export default () => (
          <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
    {
      mainComponentPath: "user-code",
    },
  )

  const source_component = circuitJson.filter(
    (el: any) => el.type === "source_component",
  ) as SourceComponentBase[]
  expect(source_component).toBeDefined()

  const supplier_part = source_component[0].supplier_part_numbers
  expect(supplier_part).toBeDefined()
})

test("should prefer basic parts when available for resistors", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlString = url.toString()
    if (urlString.includes("search") && urlString.includes("resistors")) {
      return new Response(
        JSON.stringify({
          resistors: [
            { lcsc: "1111" }, // is_basic is undefined, treated as false
            { lcsc: "2222", is_basic: true },
            { lcsc: "3333", is_basic: false },
            { lcsc: "4444", is_basic: true },
            { lcsc: "5555" },
          ],
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    }
    return originalFetch(url, init)
  }) as any

  try {
    const circuitJson = await runTscircuitCode(
      `
      export default () => (
        <board>
          <resistor name="R1" resistance="10k" footprint="0402" />
        </board>
      )
    `,
    )
    const source_component = circuitJson.find(
      (el: any) => el.type === "source_component" && el.name === "R1",
    ) as SourceComponentBase
    expect(source_component).toBeDefined()

    const supplier_part = source_component.supplier_part_numbers
    expect(supplier_part?.jlcpcb).toEqual(["C2222", "C4444", "C1111"])
  } finally {
    globalThis.fetch = originalFetch
  }
})
