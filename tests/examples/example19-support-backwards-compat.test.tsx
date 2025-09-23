import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("support backwards compat for the `.ts` extension files", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "index.ts": `
        circuit.add(
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" />
          </board>
        )
      `,
    },
    entrypoint: "index.ts",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const component = circuitJson.find((el: any) => el.name === "R1")
  expect(component).toBeDefined()
  expect(component?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
