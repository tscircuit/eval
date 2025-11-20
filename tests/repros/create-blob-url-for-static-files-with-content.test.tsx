import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/worker"

test(
  "create-blob-url-for-static-files-with-content",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
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
          "poly.kicad_mod": "<footprint></footprint>",
        },
      })

      await circuitWebWorker.renderUntilSettled()

      const circuitJson = await circuitWebWorker.getCircuitJson()

      const error = circuitJson.find(
        (e) => e.type === "external_footprint_load_error",
      )
      expect(error).toBeUndefined()
    } finally {
      await circuitWebWorker.kill()
    }
  },
  20 * 1000,
)
