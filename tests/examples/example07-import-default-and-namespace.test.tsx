import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("namespace import syntax", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
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

  await circuitWebWorker.kill()
})

test("combined default and namespace import with fallback", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "board.tsx": `
        export const MyBoard = ({ name = "BOARD1" }) => {
          return (
            <board width="10mm" height="10mm">
              <resistor name={name} resistance="10k" />
            </board>
          )
        }
      `,
      "entrypoint.tsx": `
        import DefaultExport, * as OtherExports from "./board.tsx";
        let Board = DefaultExport ?? OtherExports[Object.keys(OtherExports).filter(k => k[0] === k[0].toUpperCase())[0]];
        circuit.add(<Board />)
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const board = circuitJson.find((el: any) => el.name === "BOARD1")
  expect(board).toBeDefined()
  expect(board?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
