import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

// Dynamically create a blob worker that imports the entrypoint.
const workerEntryUrl = new URL("../webworker/entrypoint.ts", import.meta.url)
  .href
const blobCode = `import "${workerEntryUrl}"`
const blobUrl = URL.createObjectURL(
  new Blob([blobCode], { type: "application/javascript" }),
)

test("example3-encoded-worker-url", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: blobUrl,
  })

  await circuitWebWorker.execute(`
  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="1k" />
    </board>
  )
  `)

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor).toBeDefined()
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
