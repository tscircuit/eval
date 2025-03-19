import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/eval"

test("example10 runTscircuitCode", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (<resistor name="R1" resistance="1k" />)
  `)

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})
