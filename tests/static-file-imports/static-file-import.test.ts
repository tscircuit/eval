import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should import .glb file as string URL when projectBaseUrl is configured", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    platform: {
      projectBaseUrl: "https://example.com/assets",
    },
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import glbUrl from "./model.glb";
import kicadMod from "./footprint.kicad_mod";

export default () => {
  return (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" cadModel={{
        glbUrl
      }} />
    </board>
  );
};
        `,
      "model.glb": "__STATIC_ASSET__",
      "footprint.kicad_mod": "__STATIC_ASSET__",
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  // Verify the circuit rendered successfully (imports worked)
  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson).toBeDefined()

  const cadComponent = circuitJson.find((e) => e.type === "cad_component")

  expect(cadComponent.model_glb_url).toBe(
    "https://example.com/assets/model.glb",
  )

  await worker.kill()
})
