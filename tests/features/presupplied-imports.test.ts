import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("tslib is added to pre-supplied imports", async () => {
  const runner = new CircuitRunner()

  await runner.execute(`
    import { __assign } from "tslib"

    const dimensions = __assign({ width: "10mm" }, { height: "10mm" })

    circuit.add(<board {...dimensions} />)
  `)

  await runner.renderUntilSettled()

  expect(runner._executionContext?.preSuppliedImports.tslib).toBeDefined()
})
