import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import { createCircuitWebWorker } from "lib/worker"

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

test(
  "example20-kicad-direct-import-via-webworker",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
      platform: {
        ...getPlatformConfig(),
        footprintFileParserMap: {
          kicad_mod: {
            loadFromUrl: async (url: string) => {
              console.log("loadFromUrl", url)
              return {
                footprintCircuitJson: [],
              }
            },
          },
        },
      },
    })

    try {
      await circuitWebWorker.executeWithFsMap({
        fsMap: {
          "index.tsx": `
			import kicadMod from "./poly.kicad_mod"

			export default () => {
			  return (
				<board width="10mm" height="10mm">
				  <chip
					name="U1"
					footprint={kicadMod}
				  />
				</board>
			  )
			}
			`,
          "poly.kicad_mod": "__STATIC_ASSET__",
        },
      })

      await circuitWebWorker.renderUntilSettled()
    } finally {
      await circuitWebWorker.kill()
    }
  },
  20 * 1000,
)
