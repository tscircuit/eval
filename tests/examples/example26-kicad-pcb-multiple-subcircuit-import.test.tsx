import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test, expect } from "bun:test"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import fs from "node:fs"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test(
  "example26-kicad-pcb-multiple-subcircuit-import",
  async () => {
    const runner = new CircuitRunner({
      platform: {
        ...getPlatformConfig(),
      },
    })

    const jouleThiefPcbContent = fs.readFileSync(
      repoFileUrl("tests/examples/assets/joule-thief.kicad_pcb"),
      "utf8",
    )

    const exampleResistorsPcbContent = fs.readFileSync(
      repoFileUrl("tests/examples/assets/example-resistors.kicad_pcb"),
      "utf8",
    )

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
        import { circuitJson as jouleThiefPcbJson } from "./joule-thief.kicad_pcb"
        import { circuitJson as exampleResistorsPcbJson } from "./example-resistors.kicad_pcb"

        circuit.add(
          <board>
            <subcircuit circuitJson={jouleThiefPcbJson} />
            <subcircuit circuitJson={exampleResistorsPcbJson} />
          </board>
        )
			`,
        "joule-thief.kicad_pcb": jouleThiefPcbContent,
        "example-resistors.kicad_pcb": exampleResistorsPcbContent,
      },
    })

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()
    expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
    await runner.kill()
  },
  20 * 1000,
)
