import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("namespace import syntax", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/index.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "entrypoint.tsx": `
        import * as Components from "./component.tsx"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <Components.MyComponent name="COMP1" />
          </board>
        )
      `,
      "component.tsx": `
        export const MyComponent = ({ name }) => {
          return <resistor name={name} resistance="10k" />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const component = circuitJson.find((el: any) => el.name === "COMP1")
  expect(component).toBeDefined()
  expect(component?.type).toBe("source_component")
})
