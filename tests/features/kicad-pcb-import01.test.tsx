import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import fs from "node:fs"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("kicad-pcb-import01", async () => {
  const runner = new CircuitRunner({
    platform: {
      ...getPlatformConfig(),
    },
  })
  const exampleResistorsPcbContent = fs.readFileSync(
    repoFileUrl("tests/examples/assets/example-resistors.kicad_pcb"),
    "utf8",
  )

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { boardContentCircuitJson, circuitJson } from "./example-resistors.kicad_pcb"
        import { unrouteCircuitJson } from "@tscircuit/core"

      circuit.add(
          <board>
            <subcircuit circuitJson={unrouteCircuitJson(boardContentCircuitJson)} />
          </board>
      )
			`,
      "example-resistors.kicad_pcb": exampleResistorsPcbContent,
    },
  })

  const circuitJson = await runner.getCircuitJson()
  expect(circuitJson.length).toBeGreaterThan(0)
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  await runner.kill()
})
