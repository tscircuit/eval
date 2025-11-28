import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test(
  "should NOT throw error when dependency IS declared in package.json and exists on jsDelivr",
  async () => {
    const runner = new CircuitRunner()

    // This test ensures we don't break the happy path - if a dependency IS declared
    // in package.json, it should be allowed to be fetched from jsDelivr
    await runner.executeWithFsMap({
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "is-odd": "^3.0.1", // This package exists on jsDelivr
          },
        }),
        "index.tsx": `
        import isOdd from "is-odd"
        
        export default () => (
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance={isOdd(3) ? "1k" : "2k"} />
          </board>
        )
      `,
      },
      mainComponentPath: "index",
    })

    await runner.renderUntilSettled()
    const circuitJsonResult = await runner.getCircuitJson()

    expect(
      circuitJsonResult.find(
        (el) => el.type === "source_component" && el.name === "R1",
      ),
    ).toBeDefined()
  },
  { timeout: 15000 },
)
