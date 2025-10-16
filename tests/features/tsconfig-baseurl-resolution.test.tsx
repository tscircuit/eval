import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("resolves imports using tsconfig baseUrl without paths", async () => {
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
        import Comp from "./src/component"
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

test("resolves imports using tsconfig baseUrl set to root directory", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
        },
      }),
      "utils/values.ts": `
        export const resistorName = "RbaseUrlRoot"
        export const resistance = "3k"
      `,
      "component.tsx": `
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
    (el) => el.type === "source_component" && el.name === "RbaseUrlRoot",
  ) as any
  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(3000)
})

test("baseUrl does not interfere with relative imports", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: "src",
        },
      }),
      "src/utils/values.ts": `
        export const resistorName = "RelativeImport"
        export const resistance = "4k"
      `,
      "src/component.tsx": `
        import { resistorName, resistance } from "./utils/values"
        export default () => (<resistor name={resistorName} resistance={resistance} />)
      `,
      "user.tsx": `
        import Comp from "./src/component"
        export default () => (<Comp />)
      `,
    },
    {
      mainComponentPath: "user",
    },
  )

  const resistor = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "RelativeImport",
  ) as any
  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(4000)
})
