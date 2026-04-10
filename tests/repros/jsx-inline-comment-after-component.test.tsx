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

test("inline line comments after opening jsx tags do not create text nodes", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board width="10mm" height="10mm"> // board
        <resistor name="R-open" resistance="1k" />
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === "R-open",
  )

  expect(resistor).toBeDefined()
})

test("double slashes inside jsx string props are preserved", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board width="10mm" height="10mm">
        <resistor name={"https://example.com/R1"} resistance="1k" /> // note
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      element.name === "https://example.com/R1",
  )

  expect(resistor).toBeDefined()
})

test("double slashes in template literal props are preserved", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board width="10mm" height="10mm">
        <resistor name={\`https://example.com/R2\`} resistance="1k" />
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      element.name === "https://example.com/R2",
  )

  expect(resistor).toBeDefined()
})

test("double slashes in variable assigned props are preserved", async () => {
  const circuitJson = await runTscircuitCode(`
    const name = "https://example.com/R3"
    export default () => (
      <board width="10mm" height="10mm">
        <resistor name={name} resistance="1k" />
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      element.name === "https://example.com/R3",
  )

  expect(resistor).toBeDefined()
})

test("normal js line comments remain unaffected", async () => {
  const circuitJson = await runTscircuitCode(`
    const resistorName = "R-js" // regular js comment

    export default () => (
      <board width="10mm" height="10mm">
        <resistor name={resistorName} resistance="1k" />
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R-js",
  )

  expect(resistor).toBeDefined()
})

test("multiple jsx lines with trailing comments still render", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board width="10mm" height="10mm">
        <resistor name="R-multi" resistance="1k" /> // resistor
        <capacitor name="C-multi" capacitance="10uF" /> // capacitor
      </board>
    )
  `)

  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === "R-multi",
  )
  const capacitor = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === "C-multi",
  )

  expect(resistor).toBeDefined()
  expect(capacitor).toBeDefined()
})
