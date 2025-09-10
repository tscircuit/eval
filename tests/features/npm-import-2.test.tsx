import { test, expect } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test(
  "should support importing various npm packages",
  async () => {
    const circuitJson = await runTscircuitCode(
      `
    import isOdd from "is-odd"

    export default () => {
      console.log("Testing is-odd:")
      console.log(isOdd(1)) // true
      return <resistor name="R1" resistance="1k" />
    }
    `,
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    )

    expect(resistor).toBeDefined()
  },
  { timeout: 15000 },
)
