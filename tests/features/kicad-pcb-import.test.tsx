import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import fs from "fs"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("kicad-pcb-import", async () => {
  const runner = new CircuitRunner({
    platform: {
      ...getPlatformConfig({
        partsEngine: { findPart: async () => ({}) },
      }),
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

  // Keep the authored geometry intact while accepting the upstream KiCad
  // roundrect fix: radius = min(pad dimensions) * roundrect_rratio.
  const board = circuitJson.find((element) => element.type === "pcb_board")
  expect(board?.width).toBeCloseTo(129.8, 8)
  expect(board?.height).toBeCloseTo(50.795, 8)
  expect(
    circuitJson.filter((element) => element.type === "pcb_component"),
  ).toHaveLength(53)
  expect(
    circuitJson.filter((element) => element.type === "pcb_smtpad"),
  ).toHaveLength(220)
  expect(
    circuitJson.filter((element) => element.type === "pcb_trace"),
  ).toHaveLength(136)

  const roundedHoles = circuitJson
    .filter((element) => element.type === "pcb_plated_hole")
    .filter((element) => "rect_border_radius" in element)
  expect(roundedHoles).toHaveLength(9)
  const switchComponent = circuitJson
    .filter((element) => element.type === "source_component")
    .find((element) => element.name === "SW1")
  expect(switchComponent).toBeDefined()
  const switchPcb = circuitJson
    .filter((element) => element.type === "pcb_component")
    .find(
      (element) =>
        element.source_component_id === switchComponent?.source_component_id,
    )
  const switchPads = roundedHoles.filter(
    (element) => element.pcb_component_id === switchPcb?.pcb_component_id,
  )
  expect(switchPads).toHaveLength(6)
  for (const pad of switchPads) {
    // SW1's six 3 x 1.6 mm pads specify roundrect_rratio 0.1785714286.
    expect(
      "rect_border_radius" in pad ? pad.rect_border_radius : undefined,
    ).toBeCloseTo(1.6 * 0.1785714286, 8)
  }
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  await runner.kill()
})
