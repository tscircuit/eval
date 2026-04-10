import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("inline line comments after jsx components do not create text nodes", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" /> // hi
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})
