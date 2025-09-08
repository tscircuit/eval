import { test, expect } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test(
  "should support importing from npm via unpkg",
  async () => {
    const circuitJson = await runTscircuitCode(
      `
    import isOdd from "is-odd"

    export default () => {
      if (!isOdd(3)) throw new Error("isOdd failed")
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
