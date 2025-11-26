import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

test("should import .glb file as string URL from node_modules", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
    platform: {
      projectBaseUrl: "https://example.com/assets",
    },
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import { model } from "node_modules/library/index.js";

export default () => {
  return (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1"  cadModel={
          <cadmodel
            modelUrl={model.glbUrl}
          />
        }
      />
    </board>
  );
};
        `,
      "node_modules/library/assets/model.glb": "__STATIC_ASSET__",
      "node_modules/library/index.js": `
      export const model = {
        glbUrl: "./assets/model.glb",
      };
        `,
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  // Verify the circuit rendered successfully (imports worked)
  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson).toBeDefined()

  const cadComponent = circuitJson.find((e) => e.type === "cad_component")!

  expect(cadComponent.model_glb_url).toBe(
    "https://example.com/assets/node_modules/library/assets/model.glb",
  )

  await worker.kill()
})
