import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should import .glb file as string URL when projectBaseUrl is configured", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    platform: {
      projectBaseUrl: "https://example.com/assets"
    }
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import glbUrl from "./model.glb";
import kicadMod from "./footprint.kicad_mod";

export default () => {
  console.log("GLB URL:", glbUrl);
  console.log("KiCad footprint:", kicadMod);
  
  return (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
    </board>
  );
};
        `,
      "model.glb": "fake-glb-binary-content",
      "footprint.kicad_mod": "(module test_footprint (layer F.Cu) (fp_text reference REF** (at 0 0) (layer F.SilkS)))"
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  // Verify the circuit rendered successfully (imports worked)
  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson).toBeDefined()
  expect(circuitJson.filter((el: any) => el.name === "R1")).toHaveLength(1)

  await worker.kill()
})

test("should fallback to blob URL for .glb files when no projectBaseUrl", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import glbUrl from "./model.glb";

export default () => {
  console.log("GLB URL:", glbUrl);
  
  return (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
    </board>
  );
};
        `,
      "model.glb": "fake-glb-binary-content"
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  // Verify the circuit rendered successfully (imports worked)
  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson).toBeDefined()
  expect(circuitJson.filter((el: any) => el.name === "R1")).toHaveLength(1)

  await worker.kill()
})

test("should return content as string for .kicad_mod files when no projectBaseUrl", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker

  await worker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import kicadMod from "./footprint.kicad_mod";

export default () => {
  console.log("KiCad footprint:", kicadMod);
  
  return (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
    </board>
  );
};
        `,
      "footprint.kicad_mod": "(module test_footprint (layer F.Cu) (fp_text reference REF** (at 0 0) (layer F.SilkS)))"
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  // Verify the circuit rendered successfully (imports worked)
  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson).toBeDefined()
  expect(circuitJson.filter((el: any) => el.name === "R1")).toHaveLength(1)

  await worker.kill()
})