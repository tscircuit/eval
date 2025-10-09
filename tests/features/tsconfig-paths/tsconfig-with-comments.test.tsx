import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should handle tsconfig.json with comments", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": `
        {
          // This is a comment
          "compilerOptions": {
            "baseUrl": ".",
            /* Multi-line
               comment */
            "paths": {
              "@app/*": ["app/*"] // Inline comment
            }
          }
        }
      `,
      "app/component.tsx": `
        export const Component = () => <led name="LED1" />
      `,
      "main.tsx": `
        import { Component } from "@app/component"
        
        export default () => (
          <board width="10mm" height="10mm">
            <Component />
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
