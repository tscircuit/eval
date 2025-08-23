import { createCircuitWebWorker } from "lib/worker"
import { expect, test } from "bun:test"

test("example1-readme-example", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "index.tsx": `
  export default () => (
    <led name="LED1" color="red" />
  )
  `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  expect(circuitJson).toBeDefined()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led).toBeDefined()
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
