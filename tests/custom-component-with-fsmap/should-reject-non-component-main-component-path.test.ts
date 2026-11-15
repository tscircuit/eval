import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should reject mainComponentPath that is not a component", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  expect(
    worker.executeWithFsMap({
      fsMap: {
        "not-a-component.ts": `
  export default { foo: "bar" };
`,
      },
      mainComponentPath: "not-a-component.ts",
    }),
  ).rejects.toThrow(
    '"not-a-component.ts" does not export a valid tscircuit component',
  )

  await worker.kill()
})
