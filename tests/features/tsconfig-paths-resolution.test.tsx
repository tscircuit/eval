import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("resolves imports using tsconfig paths aliases", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@src/*": ["./src/*"],
            "@utils/*": ["./src/utils/*"],
          },
        },
      }),
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
