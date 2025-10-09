/**
 * Example: Using TypeScript Path Aliases
 *
 * This example demonstrates how to use tsconfig path aliases
 * for cleaner imports in your tscircuit projects.
 */

import { runTscircuitCode } from "../lib/runner"

// Example 1: Basic path alias usage
async function example1_basicPathAlias() {
  console.log("Example 1: Basic @src/* path alias")

  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@src/*": ["src/*"],
          },
        },
      }),
      "src/components/resistor.tsx": `
        export const Resistor = ({ name }: { name: string }) => (
          <resistor name={name} resistance="10k" />
        )
      `,
      "main.tsx": `
        import { Resistor } from "@src/components/resistor"
        
        export default () => (
          <board width="10mm" height="10mm">
            <Resistor name="R1" />
          </board>
        )
      `,
    },
    { mainComponentPath: "main.tsx" },
  )

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  console.log("✅ Found resistor:", resistor?.type)
  console.log("")
}

// Example 2: Multiple path aliases
async function example2_multipleAliases() {
  console.log("Example 2: Multiple path aliases")

  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"],
            "@config/*": ["src/config/*"],
          },
        },
      }),
      "src/components/led.tsx": `
        export const Led = ({ name, color }: { name: string, color?: string }) => (
          <led name={name} />
        )
      `,
      "src/utils/constants.ts": `
        export const DEFAULT_BOARD_SIZE = "20mm"
      `,
      "src/config/theme.ts": `
        export const theme = {
          spacing: "5mm"
        }
      `,
      "main.tsx": `
        import { Led } from "@components/led"
        import { DEFAULT_BOARD_SIZE } from "@utils/constants"
        import { theme } from "@config/theme"
        
        export default () => (
          <board width={DEFAULT_BOARD_SIZE} height={DEFAULT_BOARD_SIZE}>
            <Led name="LED1" />
            <Led name="LED2" />
          </board>
        )
      `,
    },
    { mainComponentPath: "main.tsx" },
  )

  const leds = circuitJson.filter((el: any) => el.type === "source_component")
  console.log("✅ Found", leds.length, "LEDs")
  console.log("")
}

// Example 3: Nested imports with path aliases
async function example3_nestedImports() {
  console.log("Example 3: Nested imports with path aliases")

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
      "lib/base/component.tsx": `
        export const BaseComponent = ({ children }: { children: any }) => children
      `,
      "lib/components/capacitor.tsx": `
        import { BaseComponent } from "@lib/base/component"
        
        export const Capacitor = ({ name }: { name: string }) => (
          <BaseComponent>
            <capacitor name={name} capacitance="10uF" />
          </BaseComponent>
        )
      `,
      "main.tsx": `
        import { Capacitor } from "@lib/components/capacitor"
        
        export default () => (
          <board width="10mm" height="10mm">
            <Capacitor name="C1" />
          </board>
        )
      `,
    },
    { mainComponentPath: "main.tsx" },
  )

  const capacitor = circuitJson.find((el: any) => el.name === "C1")
  console.log("✅ Found capacitor:", capacitor?.type)
  console.log("")
}

// Run all examples
async function main() {
  console.log("=".repeat(60))
  console.log("TypeScript Path Aliases Examples")
  console.log("=".repeat(60))
  console.log("")

  await example1_basicPathAlias()
  await example2_multipleAliases()
  await example3_nestedImports()

  console.log("=".repeat(60))
  console.log("✅ All examples completed successfully!")
  console.log("=".repeat(60))
}

main().catch(console.error)
