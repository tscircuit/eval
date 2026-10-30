import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { createCircuitWebWorker } from "lib/worker"
import { repoFileUrl } from "../fixtures/resourcePaths"

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

test("@tscircuit/mm is added to pre-supplied imports", async () => {
  const runner = new CircuitRunner()

  await runner.execute(`
    import { mm } from "@tscircuit/mm"

    circuit.add(<board width={mm(10)} height={mm(10)} />)
  `)

  await runner.renderUntilSettled()

  expect(
    runner._executionContext?.preSuppliedImports["@tscircuit/mm"],
  ).toBeDefined()
})

test.each(["runner", "worker"] as const)(
  "@tscircuit/props runtime schemas can be imported and used (%s)",
  async (runtime) => {
    const runner =
      runtime === "runner"
        ? new CircuitRunner()
        : await createCircuitWebWorker({
            webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
          })

    try {
      await runner.execute(`
        import { fanoutTracePath } from "@tscircuit/props"
        import type { BoardProps } from "@tscircuit/props"

        const path = fanoutTracePath.parse({
          connection: ".J1 > .SWDIO",
          route: [
            { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
            { route_type: "wire", x: 10, y: 0, width: 0.2, layer: "top" },
          ],
        })
        const dimensions: BoardProps = { width: path.route[1].x, height: 10 }

        circuit.add(<board {...dimensions} />)
      `)

      await runner.renderUntilSettled()

      expect(await runner.getCircuitJson()).toContainEqual(
        expect.objectContaining({ type: "pcb_board", width: 10, height: 10 }),
      )
    } finally {
      await runner.kill()
    }
  },
)
