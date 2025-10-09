import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

test("tsconfig paths - basic alias resolution", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@lib/*": ["lib/*"],
              "@components/*": ["src/components/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { MyResistor } from "@lib/resistor"
        import { MyLed } from "@components/led"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyResistor name="R1" resistance="10k" />
            <MyLed name="LED1" />
          </board>
        )
      `,
      "lib/resistor.tsx": `
        export const MyResistor = ({ name, resistance }) => {
          return <resistor name={name} resistance={resistance} />
        }
      `,
      "src/components/led.tsx": `
        import { RedLed } from "@tsci/seveibar.red-led"
        
        export const MyLed = ({ name }) => {
          return <RedLed name={name} />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - wildcard pattern", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@utils/*": ["src/utils/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { calculateValue } from "@utils/calculations"
        
        const resistance = calculateValue("10k")
        
        circuit.add(
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance={resistance} />
          </board>
        )
      `,
      "src/utils/calculations.ts": `
        export function calculateValue(value: string): string {
          return value
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - multiple path mappings for same alias", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@components/*": ["src/components/*", "lib/components/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { MyResistor } from "@components/resistor"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyResistor name="R1" resistance="10k" />
          </board>
        )
      `,
      "lib/components/resistor.tsx": `
        export const MyResistor = ({ name, resistance }) => {
          return <resistor name={name} resistance={resistance} />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - with baseUrl and nested imports", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": "src",
            "paths": {
              "@lib/*": ["lib/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { MyComponent } from "@lib/components/mycomponent"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyComponent name="C1" />
          </board>
        )
      `,
      "src/lib/components/mycomponent.tsx": `
        export const MyComponent = ({ name }) => {
          return <resistor name={name} resistance="10k" />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const component = circuitJson.find((el: any) => el.name === "C1")
  expect(component?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - exact match without wildcard", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@utils": ["src/utils/index"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { getValue } from "@utils"
        
        const value = getValue()
        
        circuit.add(
          <board width="10mm" height="10mm">
            <resistor name={value} resistance="10k" />
          </board>
        )
      `,
      "src/utils/index.ts": `
        export function getValue(): string {
          return "R1"
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - with comments in tsconfig", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          // Compiler options
          "compilerOptions": {
            "baseUrl": ".",
            /* Path mappings for easier imports */
            "paths": {
              "@components/*": ["src/components/*"] // Component paths
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { MyResistor } from "@components/resistor"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyResistor name="R1" resistance="10k" />
          </board>
        )
      `,
      "src/components/resistor.tsx": `
        export const MyResistor = ({ name, resistance }) => {
          return <resistor name={name} resistance={resistance} />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - fallback to relative imports", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@lib/*": ["lib/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { MyResistor } from "@lib/resistor"
        import { MyLed } from "./led"
        
        circuit.add(
          <board width="10mm" height="10mm">
            <MyResistor name="R1" resistance="10k" />
            <MyLed name="LED1" />
          </board>
        )
      `,
      "lib/resistor.tsx": `
        export const MyResistor = ({ name, resistance }) => {
          return <resistor name={name} resistance={resistance} />
        }
      `,
      "led.tsx": `
        import { RedLed } from "@tsci/seveibar.red-led"
        
        export const MyLed = ({ name }) => {
          return <RedLed name={name} />
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor = circuitJson.find((el: any) => el.name === "R1")
  expect(resistor?.type).toBe("source_component")

  const led = circuitJson.find((el: any) => el.name === "LED1")
  expect(led?.type).toBe("source_component")

  await circuitWebWorker.kill()
})

test("tsconfig paths - nested component imports with aliases", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  await circuitWebWorker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@lib/*": ["lib/*"],
              "@utils/*": ["utils/*"]
            }
          }
        }
      `,
      "entrypoint.tsx": `
        import { PowerSupply } from "@lib/powersupply"
        
        circuit.add(
          <board width="20mm" height="20mm">
            <PowerSupply name="PS1" />
          </board>
        )
      `,
      "lib/powersupply.tsx": `
        import { Resistor } from "@lib/resistor"
        import { calculateResistance } from "@utils/calc"
        
        export const PowerSupply = ({ name }) => {
          const resistance = calculateResistance(5, 3.3)
          return (
            <group>
              <Resistor name={\`\${name}_R1\`} resistance={resistance} />
              <resistor name={\`\${name}_R2\`} resistance="1k" />
            </group>
          )
        }
      `,
      "lib/resistor.tsx": `
        export const Resistor = ({ name, resistance }) => {
          return <resistor name={name} resistance={resistance} />
        }
      `,
      "utils/calc.ts": `
        export function calculateResistance(v1: number, v2: number): string {
          const ohms = Math.round((v1 - v2) / 0.02)
          return \`\${ohms}ohm\`
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  const resistor1 = circuitJson.find((el: any) => el.name === "PS1_R1")
  expect(resistor1?.type).toBe("source_component")

  const resistor2 = circuitJson.find((el: any) => el.name === "PS1_R2")
  expect(resistor2?.type).toBe("source_component")

  await circuitWebWorker.kill()
})
