import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("example13 node_modules imports", async () => {
  const runner = new CircuitRunner()
  const fsMap = {
    "node_modules/my-resistor/index.tsx": `
      export const MyResistor = ({ name }) => (<resistor name={name} resistance="1k" />)
    `,
    "user-code.tsx": `
      import { MyResistor } from "my-resistor";
      export default () => (<MyResistor name="R1" />)
    `,
  }

  await runner.executeWithFsMap({
    fsMap,
    mainComponentPath: "user-code",
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})

test("absolute path imports still work", async () => {
  const runner = new CircuitRunner()
  const fsMap = {
    "components/resistor.tsx": `
      export const MyResistor = ({ name }) => (<resistor name={name} resistance="1k" />)
    `,
    "user-code.tsx": `
      import { MyResistor } from "components/resistor";
      export default () => (<MyResistor name="R1" />)
    `,
  }

  await runner.executeWithFsMap({
    fsMap,
    mainComponentPath: "user-code",
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})
