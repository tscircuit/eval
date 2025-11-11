import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import fs from "fs"

test(
  "example22-kicad-pcb-import",
  async () => {
    const runner = new CircuitRunner({
      platform: {
        ...getPlatformConfig(),
      },
    })

    const kicadPcbContent = fs.readFileSync(
      repoFileUrl("tests/examples/assets/kicad_demo.kicad_pcb"),
      "utf8",
    )

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
        import kicadPcbJson from "./test.kicad_pcb"
			circuit.add(
			  <board width="10mm" height="10mm">
     <subcircuit circuitJson={kicadPcbJson} />
			  </board>
			)
			`,
        "test.kicad_pcb": kicadPcbContent,
      },
    })

    await runner.renderUntilSettled()
    await runner.kill()
  },
  20 * 1000,
)
