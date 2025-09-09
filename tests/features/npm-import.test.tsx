import { test, expect } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test(
  "should support importing various npm packages",
  async () => {
    const circuitJson = await runTscircuitCode(
      `
    import _ from "lodash"
    import { v4 as uuidv4 } from "uuid"
    import dayjs from "dayjs"

    export default () => {
      // Test lodash
      if (!_.isEqual({ a: 1 }, { a: 1 })) {
        throw new Error("_.isEqual failed")
      }

      // Test uuid
      const uuid = uuidv4()
      if (typeof uuid !== "string" || uuid.length < 36) {
        throw new Error("uuid.v4 failed to generate a valid uuid")
      }

      // Test dayjs
      if (!dayjs().isValid()) {
        throw new Error("dayjs().isValid() failed")
      }
      
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
