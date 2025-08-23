import { test, expect } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("group is not wrapped in board", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <group name="G2">
        <resistor name="R1" footprint="0402" resistance="10k" />
        <capacitor name="C1" capacitance="10uF" footprint="0603" />
      </group>
    )
  `)

  const sourceGroups = circuitJson.filter((el) => el.type === "source_group")

  expect(sourceGroups.length).toBe(1)
  expect(sourceGroups[0].name).toBe("G2")
})
