import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("reports a helpful error when a static asset placeholder is evaluated as JavaScript from tscircuit.config.ts", async () => {
  const runner = new CircuitRunner()

  try {
    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          dependencies: {
            "bad-static-package": "1.0.0",
          },
        }),
        "tscircuit.config.ts": `
          import config from "bad-static-package"

          export default {
            platformConfig: config,
          }
        `,
        "index.tsx": `
          circuit.add(<board width="10mm" height="10mm" />)
        `,
        "node_modules/bad-static-package/package.json": JSON.stringify({
          main: "index.js",
        }),
        "node_modules/bad-static-package/index.js": `
          export default __STATIC_ASSET__
        `,
      },
    })
    throw new Error("Expected executeWithFsMap to fail")
  } catch (error: any) {
    expect(error.message).toContain(
      'Static asset placeholder "__STATIC_ASSET__" was evaluated as JavaScript',
    )
    expect(error.message).toContain(
      'while importing "node_modules/bad-static-package/index.js"',
    )
    expect(error.message).toContain(
      "Provide the asset contents, a blob URL, or configure platform.projectBaseUrl/staticFileLoaderMap",
    )
  }
})
