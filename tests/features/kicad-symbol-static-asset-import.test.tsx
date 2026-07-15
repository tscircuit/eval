import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { CircuitRunner } from "lib/index"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("imports a .kicad_sym static asset URL as a chip symbol", async () => {
  const kicadSymbolContent = readFileSync(
    repoFileUrl("tests/fixtures/assets/test-symbol.kicad_sym"),
    "utf8",
  )
  const symbolUrl = "https://example.com/assets/part.kicad_sym"
  const fetchedUrls: string[] = []
  const platformFetch = (async (input: RequestInfo | URL) => {
    fetchedUrls.push(String(input))
    return new Response(kicadSymbolContent)
  }) as typeof fetch
  const runner = new CircuitRunner({
    projectConfig: {
      projectBaseUrl: "https://example.com/assets",
      platformFetch,
    },
  })

  try {
    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          import circuitJsonForSymbol from "./part.kicad_sym"

          circuit.add(
            <board width="10mm" height="10mm">
              <chip name="U1" symbol={circuitJsonForSymbol} />
            </board>,
          )
        `,
        "part.kicad_sym": "__STATIC_ASSET__",
      },
    })

    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()
    expect(fetchedUrls).toEqual([symbolUrl])
    expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
  } finally {
    await runner.kill()
  }
})
