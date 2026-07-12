import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should reject empty mainComponentPath file with a clear message", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker

  // The file exists in the fsMap but has empty content. This should not be
  // reported as "not found" (the path is right there), but as an empty file.
  const emptyPromise = worker.executeWithFsMap({
    fsMap: {
      "32pin.circuit.tsx": "",
    },
    mainComponentPath: "32pin.circuit.tsx",
  })
  await expect(emptyPromise).rejects.toThrow(
    'Main component file "32pin.circuit.tsx" is empty',
  )
  await expect(emptyPromise).rejects.not.toThrow("not found")

  // A whitespace-only file is just as unusable as an empty one and should get
  // the same clear message rather than a confusing downstream failure.
  const whitespacePromise = worker.executeWithFsMap({
    fsMap: {
      "32pin.circuit.tsx": "\n   \n",
    },
    mainComponentPath: "32pin.circuit.tsx",
  })
  await expect(whitespacePromise).rejects.toThrow(
    'Main component file "32pin.circuit.tsx" is empty',
  )

  await worker.kill()
})
