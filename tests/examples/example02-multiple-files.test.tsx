import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("virtual filesystem with components", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "@tsci/seveibar.red-led": "^1.0.0",
        },
      }),
      "entrypoint.tsx": `
        import { MyLed } from "./myled.tsx"
        import someJson from "./some.json"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyLed name="LED1" />
          </board>
        )
      `,
      "myled.tsx": `
        import { RedLed } from "@tsci/seveibar.red-led"
        
        export const MyLed = ({ name }) => {
          return <RedLed name={name} />
        }
      `,
      "some.json": `
        {
          "some": "value"
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
