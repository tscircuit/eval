import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

// Ensure that when runtime errors occur, the offending line is included

test("execution error includes source line", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  await expect(
    worker.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          circuit.add(<board width="10mm" height="10mm" />)
          throw new Error("boom")
        `,
      },
    }),
  ).rejects.toThrow(/boom\n[\s\S]*index.tsx:3/)

  await worker.kill()
})
