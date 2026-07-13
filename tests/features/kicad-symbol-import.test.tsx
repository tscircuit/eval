import { expect, test } from "bun:test"
import { CircuitRunner, getPlatformConfig } from "lib/index"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { readFileSync } from "node:fs"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("imports a .kicad_sym file as a chip symbol", async () => {
  const kicadSymbolContent = readFileSync(
    repoFileUrl("tests/fixtures/assets/test-symbol.kicad_sym"),
    "utf8",
  )
  const runner = new CircuitRunner({ platform: getPlatformConfig() })

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
      "part.kicad_sym": kicadSymbolContent,
    },
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()
  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  await runner.kill()
})
