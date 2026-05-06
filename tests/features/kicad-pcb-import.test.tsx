import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import fs from "fs"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("kicad-pcb-import", async () => {
  const runner = new CircuitRunner({
    platform: {
      ...getPlatformConfig(),
    },
  })
  const kicadPcbContent = fs.readFileSync(
    repoFileUrl("tests/examples/assets/joule-thief.kicad_pcb"),
    "utf8",
  )

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
			import { Board } from "./joule-thief.kicad_pcb"

      circuit.add(
        <Board />
      )
			`,
      "joule-thief.kicad_pcb": kicadPcbContent,
    },
  })

  const circuitJson = await runner.getCircuitJson()
  expect(circuitJson.length).toBeGreaterThan(0)
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  await runner.kill()
})
