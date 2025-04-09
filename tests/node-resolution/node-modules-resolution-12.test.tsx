import { describe, expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
describe("node module resolution", () => {
  test("node_modules resolution supports tsx", async () => {
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
})
