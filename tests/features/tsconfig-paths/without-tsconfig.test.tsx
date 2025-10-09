import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should work without tsconfig.json", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "components/led.tsx": `
        export const Led = ({ name }: { name: string }) => (
          <led name={name} />
        )
      `,
      "main.tsx": `
        import { Led } from "./components/led"
        
        export default () => (
          <board width="10mm" height="10mm">
            <Led name="LED1" />
          </board>
        )
      `,
    },
    {
      mainComponentPath: "main.tsx",
    },
  )

  const led = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "LED1",
  )

  expect(led).toBeDefined()
})
