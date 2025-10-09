import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should resolve nested imports with path aliases", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@lib/*": ["lib/*"],
          },
        },
      }),
      "lib/components/base-component.tsx": `
        export const BaseComponent = ({ children }: { children: any }) => children
      `,
      "lib/components/capacitor.tsx": `
        import { BaseComponent } from "@lib/components/base-component"
        
        export const Capacitor = ({ name, capacitance }: { name: string, capacitance: string }) => (
          <BaseComponent>
            <capacitor name={name} capacitance={capacitance} />
          </BaseComponent>
        )
      `,
      "main.tsx": `
        import { Capacitor } from "@lib/components/capacitor"
        
        export default () => (
          <board width="10mm" height="10mm">
            <Capacitor name="C1" capacitance="10uF" />
          </board>
        )
      `,
    },
    {
      mainComponentPath: "main.tsx",
    },
  )

  const capacitor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "C1",
  )

  expect(capacitor).toBeDefined()
  expect(capacitor?.type).toBe("source_component")
})
