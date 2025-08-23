import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("example11 flexible imports", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "resistor.tsx": `export default () => (<resistor name="R1" resistance="1k" />)`,
      "user-code.tsx": `import Resistor from "./resistor";\nexport default () => (<Resistor />)`,
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
