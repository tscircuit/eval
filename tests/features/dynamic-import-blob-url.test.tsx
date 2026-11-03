import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

// @tscircuit/ngspice-spice-engine fetches its core from a CDN and loads it
// with import(URL.createObjectURL(blob))
test("import() of a blob URL loads the module natively", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    mainComponentPath: "index.tsx",
    fsMap: {
      "load-core.ts": `
        export const loadCore = async () => {
          const moduleUrl = URL.createObjectURL(
            new Blob(["export const coreName = 'blob-core'"], {
              type: "text/javascript",
            })
          )
          const core = await import(moduleUrl)
          return core.coreName
        }
      `,
      "index.tsx": `
        import { loadCore } from "./load-core"
        globalThis.__blobCoreName = loadCore()
        export default () => <board width="10mm" height="10mm" />
      `,
    },
  })
  await runner.renderUntilSettled()
  await runner.kill()

  expect(await (globalThis as any).__blobCoreName).toBe("blob-core")
})
