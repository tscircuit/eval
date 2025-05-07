import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should reject invalid mainComponentPath", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  expect(
    worker.executeWithFsMap({
      fsMap: {
        "index.tsx": `
  export default () => (
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="E1" />
    </board>
  );
`,
      },
      mainComponentPath: "myled.tsx",
    }),
  ).rejects.toThrow('File not found "myled.tsx"')

  await worker.kill()
})
