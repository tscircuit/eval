import { expect, test } from "bun:test"
import { createCircuitWebWorker, InMemoryFilesystemMap } from "lib"

test("executeWithFsMap accepts filesystem handler", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const fs = new InMemoryFilesystemMap({
    "entrypoint.tsx": `
      circuit.add(<board name="TestBoard" width="1mm" height="1mm" />)
    `,
  })

  await worker.executeWithFsMap({
    fs,
    entrypoint: "entrypoint.tsx",
  })

  await worker.renderUntilSettled()
  const circuitJson = await worker.getCircuitJson()

  expect(circuitJson.find((el: any) => el.name === "TestBoard")).toBeDefined()

  await worker.kill()
})
