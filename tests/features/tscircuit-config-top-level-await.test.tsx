import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

// Configs often create async resources up front, e.g.
// spiceEngineMap: { ngspice: await createNgspiceSpiceEngine() }
test("tscircuit.config.ts can use top-level await", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    mainComponentPath: "index.tsx",
    fsMap: {
      "engine.ts": `
        export const createEngine = async () => ({ name: "awaited-engine" })
      `,
      "tscircuit.config.ts": `
        import { createEngine } from "./engine"

        const engine = await createEngine()
        globalThis.__awaitedEngineName = engine.name

        export default {
          platformConfig: { spiceEngineMap: { fake: await createEngine() } },
        }
      `,
      "index.tsx": `
        export default () => (
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
          </board>
        )
      `,
    },
  })
  await runner.renderUntilSettled()
  await runner.kill()

  expect((globalThis as any).__awaitedEngineName).toBe("awaited-engine")
})

test("await inside async functions keeps working", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    mainComponentPath: "index.tsx",
    fsMap: {
      "lib.ts": `
        export const load = async () => { await null; return "inner await ok" }
      `,
      "index.tsx": `
        import { load } from "./lib"
        load().then((v) => { globalThis.__innerAwait = v })
        export default () => <board width="10mm" height="10mm" />
      `,
    },
  })
  await runner.renderUntilSettled()
  await runner.kill()

  expect((globalThis as any).__innerAwait).toBe("inner await ok")
})
