import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("default import resolution", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "simple-component.tsx": `import { resistor } from "@tsci/seveibar.resistor"

        export default () => (
           <board width="20mm" height="20mm">
             <resistor name="R1" resistance="10k" />
           </board>
        )`,

      "entrypoint.tsx": `import SimpleComponent from "./simple-component.tsx"
       circuit.add(<SimpleComponent />)`,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()
  const component = circuitJson.find((el: any) => el.name === "R1")
  expect(component).toBeDefined()
  expect(component?.type).toBe("source_component")
})
