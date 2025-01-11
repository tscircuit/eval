import { expect, test } from "bun:test"
import { CircuitEvaluator } from "lib"

test("virtual filesystem with components", async () => {
  const circuitEvaluator = new CircuitEvaluator()

  await circuitEvaluator.executeWithFsMap({
    fsMap: {
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

  await circuitEvaluator.renderUntilSettled()

  const circuitJson = await circuitEvaluator.getCircuitJson()

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led?.type).toBe("source_component")
})
