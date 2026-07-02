import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

// ESM-style relative imports that carry an explicit ".js" extension often
// point at TypeScript source (e.g. zod v4's "../core/util.js" -> "util.ts").
// The resolver must strip the ".js"/".jsx" suffix and try the TS candidates.
test("resolves ESM .js relative imports that point at TypeScript source", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "lib/core/util.ts": `export const resistorName = "R1"`,
      "lib/resistor.tsx": `
      import { resistorName } from "./core/util.js"
      export default () => (<resistor name={resistorName} resistance="1k" />)
      `,
      "user-code.tsx": `import Resistor from "./lib/resistor";\nexport default () => (<Resistor />)`,
    },
    {
      mainComponentPath: "user-code",
    },
  )

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})
