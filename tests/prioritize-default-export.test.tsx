import { runTscircuitCode } from "lib/runner"
import { expect, test } from "bun:test"

test("example12 subdirectory relative imports", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "lib/resistor.tsx": `
        export default () => (<resistor name="R1" resistance="1k" />)
      `,
      "user-code.tsx": `
        import Resistor from "./lib/resistor";
        export default () => (<resistor name="R2" resistance="2k" />)
        export {Resistor}
      `,
    },
    {
      mainComponentPath: "user-code",
    },
  )

  const resistor = circuitJson.find(
    (element) => element.type === "source_component",
  )

  expect(resistor).toBeDefined()
  expect(resistor?.name).toBe("R2")
  console.log(resistor)
})
