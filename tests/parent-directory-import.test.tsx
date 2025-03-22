import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("example13 parent directory relative imports", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "lib/resistor-name.ts": `export const resistorName = "R1"`,
      "lib/subdir/resistance-value.ts": `export const resistanceValue = "1k"`,
      "lib/subdir/resistor.tsx": `
      import { resistanceValue } from "./resistance-value"
      import { resistorName } from "../resistor-name"
      export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
      `,
      "user-code.tsx": `import Resistor from "./lib/subdir/resistor";\nexport default () => (<Resistor />)`,
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
