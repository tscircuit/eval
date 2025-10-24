import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"

test(
  "example20-kicad-direct-import",
  async () => {
    const runner = new CircuitRunner({
      platform: {
        ...getPlatformConfig(),
        footprintFileParserMap: {
          kicad_mod: {
            loadFromUrl: async (url: string) => {
              expect(url).toEqual("/poly.kicad_mod")
              return {
                footprintCircuitJson: [],
              }
            },
          },
        },
      },
    })

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
			import kicadMod from "./poly.kicad_mod"

			circuit.add(
			  <board width="10mm" height="10mm">
				<chip
				  name="U1"
				  footprint={kicadMod}
				/>
			  </board>
			)
			`,
        "poly.kicad_mod": "__STATIC_ASSET__",
      },
    })

    await runner.renderUntilSettled()
    await runner.kill()
  },
  20 * 1000,
)
