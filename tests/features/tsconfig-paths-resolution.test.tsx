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

test("tsconfig paths honor baseUrl when targets use relative prefixes", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: "./src",
          paths: {
            "@components/*": ["./components/*"],
          },
        },
      }),
      "src/components/res.tsx": `
        export default () => (<resistor name="Rbase" resistance="1k" />)
      `,
      "user.tsx": `
        import Resistor from "@components/res"
        export default () => (<Resistor />)
      `,
    },
    {
      mainComponentPath: "user",
    },
  )

  const resistor = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "Rbase",
  ) as any
  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(1000)
})
