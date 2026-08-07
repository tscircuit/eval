import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("browser evaluator resolves directory imports to index.tsx", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  try {
    await circuitWebWorker.executeWithFsMap({
      entrypoint: "entrypoint.tsx",
      fsMap: {
        "entrypoint.tsx": `
          import { Part } from "./imports"

          circuit.add(<Part />)
        `,
        "imports/index.tsx": `
          export const Part = () => (
            <resistor name="R1" resistance="1k" footprint="0402" />
          )
        `,
      },
    })

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()
    expect(
      circuitJson.some(
        (element: any) =>
          element.type === "source_component" && element.name === "R1",
      ),
    ).toBe(true)
  } finally {
    await circuitWebWorker.kill()
  }
})
