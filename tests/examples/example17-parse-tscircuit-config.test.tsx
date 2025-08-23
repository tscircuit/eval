import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("parse tscircuit.config.js with mainEntrypoint", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tscircuit.config.json": `
        {
          "mainEntrypoint": "random1.tsx"
        }
      `,
      "random1.tsx": `
        import { MyLed } from "./random2.tsx"
        import someJson from "./random3.json"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyLed name="LED1" />
          </board>
        )
      `,
      "random2.tsx": `
        import { RedLed } from "@tsci/seveibar.red-led"
        
        export const MyLed = ({ name }) => {
          return <RedLed name={name} />
        }
      `,
      "random3.json": `
        {
          "some": "value"
        }
      `,
    },
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
