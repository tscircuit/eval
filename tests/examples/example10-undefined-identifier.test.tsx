import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

test("example10-undefined-identifier", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  // A part number that was never imported throws a ReferenceError. The message
  // is normalized so every project that makes this mistake groups as one issue,
  // while the identifier survives in the suffix for the person debugging.
  expect(async () => {
    await circuitWebWorker.execute(`
        circuit.add(
            <board width="10mm" height="10mm">
                <chip name="U1" footprint={A_12401610E4_2A} />
            </board>
        );
      `)
  }).toThrowError(
    `Error evaluating "entrypoint.tsx": undefined identifier "A_12401610E4_2A"`,
  )

  await circuitWebWorker.kill()
})
