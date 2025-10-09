import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should resolve index files with path aliases", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@components/*": ["components/*"],
          },
        },
      }),
      "components/leds/index.tsx": `
        export const Led = ({ name }: { name: string }) => (
          <led name={name} />
        )
      `,
      "main.tsx": `
        import { Led } from "@components/leds"
        
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
