import { createCircuitWebWorker, runTscircuitCode } from "lib/index"
import { expect, test } from "bun:test"
import type { SourceComponentBase } from "circuit-json"

test("example16-jlc-parts-engine with entrypoint", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
    verbose: true
  })

  await circuitWebWorker.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        circuit.add(
          <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const source_component = circuitJson.filter(
    (el: any) => el.type === "source_component",
  ) as SourceComponentBase[]
  expect(source_component).toBeDefined()

  const supplier_part = source_component[0].supplier_part_numbers
  expect(supplier_part).toBeDefined()
})

test("example16-jlc-parts-engine with mainComponentPath", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "user-code.tsx": `
        export default () => (
          <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
    {
      mainComponentPath: "user-code",
    }
  )

  const source_component = circuitJson.filter(
    (el: any) => el.type === "source_component",
  ) as SourceComponentBase[]
  expect(source_component).toBeDefined()

  const supplier_part = source_component[0].supplier_part_numbers
  expect(supplier_part).toBeDefined()
})
