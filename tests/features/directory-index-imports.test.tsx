import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("resolves a relative directory import to its index file", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "lib/component/index.tsx": `
        export default () => <resistor name="R1" resistance="1k" />
      `,
      "user-code.tsx": `
        import Component from "./lib/component"
        export default () => <Component />
      `,
    },
    { mainComponentPath: "user-code" },
  )

  expect(
    circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    ),
  ).toBeDefined()
})

test("resolves a baseUrl directory import to its index file", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: "." },
      }),
      "lib/component/index.tsx": `
        export default () => <resistor name="R1" resistance="1k" />
      `,
      "user-code.tsx": `
        import Component from "lib/component"
        export default () => <Component />
      `,
    },
    { mainComponentPath: "user-code" },
  )

  expect(
    circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    ),
  ).toBeDefined()
})
