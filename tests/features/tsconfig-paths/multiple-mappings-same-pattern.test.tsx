import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should handle multiple mappings for same pattern", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@shared/*": ["src/shared/*", "lib/shared/*"],
          },
        },
      }),
      "src/shared/component.tsx": `
        export const SharedComponent = () => <led name="LED1" />
      `,
      "main.tsx": `
        import { SharedComponent } from "@shared/component"
        
        export default () => (
          <board width="10mm" height="10mm">
            <SharedComponent />
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
