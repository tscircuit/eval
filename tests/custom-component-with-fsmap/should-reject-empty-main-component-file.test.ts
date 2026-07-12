import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should reject empty mainComponentPath file with a clear message", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  // The file exists in the fsMap but has empty content. This should not be
  // reported as "not found" (the path is right there), but as an empty file.
  const promise = worker.executeWithFsMap({
    fsMap: {
      "32pin.circuit.tsx": "",
    },
    mainComponentPath: "32pin.circuit.tsx",
  })

  await expect(promise).rejects.toThrow(
    'Main component file "32pin.circuit.tsx" is empty',
  )
  await expect(promise).rejects.not.toThrow("not found")

  await worker.kill()
})
