import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should import npm packages from CDN which have minified imports", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    fsMap: {
      "index.tsx": `
import { MicroModBoard } from "@tscircuit/common"

export default () => (
  <MicroModBoard name="U1" />
)
      `,
      "package.json": `
{
  "name": "test-npm-import",
  "version": "1.0.0",
  "dependencies": {
    "@tscircuit/common": "^0.0.30"
  }
}
      `,
    },
  })

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()
  expect(circuitJson).toBeDefined()
  expect(circuitJson.length).toBeGreaterThan(0)

  // Verify that the MicroModBoard component was rendered
  const chip = circuitJson.find(
    (el: any) => el.type === "source_component" && el.name === "U1_chip",
  )
  expect(chip).toBeDefined()
})
