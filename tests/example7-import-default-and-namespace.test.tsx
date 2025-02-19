import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("import default and namespace syntax", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/index.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "entrypoint.tsx": `
        import DefaultExport, * as AllExports from "./component.tsx"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <DefaultExport name="COMP1" />
            <AllExports.OtherComponent name="COMP2" />
          </board>
        )
      `,
      "component.tsx": `
        export const OtherComponent = ({ name }) => {
          return <resistor name={name} resistance="10k" />
        }

        const DefaultComponent = ({ name }) => {
          return <capacitor name={name} capacitance="100uF" />
        }

        export default DefaultComponent
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  // Verify both components were added
  const defaultComp = circuitJson.find((el: any) => el.name === "COMP1")
  expect(defaultComp).toBeDefined()
  expect(defaultComp?.type).toBe("source_component")

  const namespaceComp = circuitJson.find((el: any) => el.name === "COMP2")
  expect(namespaceComp).toBeDefined()
  expect(namespaceComp?.type).toBe("source_component")
})
