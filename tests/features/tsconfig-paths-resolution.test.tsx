import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("resolves imports using tsconfig paths aliases", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": `{
        "compilerOptions": {
          "target": "ES6",
          // "target": "ES6",
          "module": "ESNext",
          "jsx": "react-jsx",
          "outDir": "dist",
          "strict": true,
          "esModuleInterop": true,
          "moduleResolution": "node",
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "resolveJsonModule": true,
          "sourceMap": true,
          "allowSyntheticDefaultImports": true,
          "experimentalDecorators": true,
          "types": ["tscircuit", "bun"],
          "baseUrl": ".",
          "paths": {
            "@src/*": ["./src/*"],
            "@utils/*": ["./src/utils/*"]
          }
        }
      }`,
      "src/utils/values.ts": `
        export const resistorName = "Rpaths"
        export const resistance = "1k"
      `,
      "src/component.tsx": `
        import { resistorName, resistance } from "@utils/values"
        export default () => (<resistor name={resistorName} resistance={resistance} />)
      `,
      "user.tsx": `
        import Comp from "@src/component"
        export default () => (<Comp />)
      `,
    },
    {
      mainComponentPath: "user",
    },
  )

  const resistor = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "Rpaths",
  ) as any
  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(1000)
})

test("throws error when tsconfig path alias cannot be resolved (instead of trying jsdelivr)", async () => {
  expect(
    runTscircuitCode(
      {
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "@utils/*": ["./src/utils/*"],
            },
          },
        }),
        "user.tsx": `
          import { something } from "@utils/missing"
          export default () => (<resistor name="R1" resistance="1k" />)
        `,
      },
      {
        mainComponentPath: "user",
      },
    ),
  ).rejects.toThrow(
    'Import "@utils/missing" matches a tsconfig path alias but could not be resolved to an existing file',
  )
})

test("resolves imports using tsconfig baseUrl", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: "src",
        },
      }),
      "src/utils/values.ts": `
        export const resistorName = "RbaseUrl"
        export const resistance = "2k"
      `,
      "src/component.tsx": `
        import { resistorName, resistance } from "utils/values"
        export default () => (<resistor name={resistorName} resistance={resistance} />)
      `,
      "user.tsx": `
        import Comp from "component"
        export default () => (<Comp />)
      `,
    },
    {
      mainComponentPath: "user",
    },
  )

  const resistor = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "RbaseUrl",
  ) as any
  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(2000)
})

test("throws error when tsconfig.json is malformed", async () => {
  await expect(
    runTscircuitCode(
      {
        "tsconfig.json": `{ "compilerOptions": { baseUrl": "src" } }`, // Malformed JSON
        "user.tsx": `export default () => (<resistor name="R1" resistance="1k" />)`,
      },
      {
        mainComponentPath: "user",
      },
    ),
  ).rejects.toThrow(/Failed to parse tsconfig.json/)
})
