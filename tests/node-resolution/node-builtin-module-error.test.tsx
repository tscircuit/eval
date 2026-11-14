import { describe, expect, test } from "bun:test"
import { evalCompiledJs } from "lib/eval/eval-compiled-js"
import { CircuitRunner } from "lib/runner"

describe("Node.js built-in module resolution diagnostics (#5179)", () => {
  test("reports unsupported Node.js built-in error for node:events instead of missing package.json dependency", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    let caughtError: Error | undefined
    try {
      await runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "builtin-import-repro",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { EventEmitter } from "node:events"
            const bus = new EventEmitter()
            export default () => <board width="10mm" height="10mm" />
          `,
        },
      })
    } catch (err: any) {
      caughtError = err
    }

    expect(caughtError).toBeDefined()
    expect(caughtError!.message).toContain(
      'Node.js built-in module "node:events" is not available in the tscircuit execution environment',
    )
    expect(caughtError!.message).not.toContain(
      "Node module imported but not in package.json",
    )
  })

  test("reports unsupported Node.js built-in error for bare built-in specifiers when not declared in package.json", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    await expect(
      runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "bare-builtin-repro",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import fs from "fs/promises"
            export default () => <board width="10mm" height="10mm" />
          `,
        },
      }),
    ).rejects.toThrow(
      'Node.js built-in module "fs/promises" is not available in the tscircuit execution environment',
    )
  })

  test("preserves built-in diagnostic even when platform.nodeModulesResolver is configured with CDN disabled", async () => {
    const runner = new CircuitRunner({
      platform: {
        nodeModulesResolver: async () => {
          throw new Error("not found on disk")
        },
      },
    })
    await runner.setDisableCdnLoading(true)

    await expect(
      runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "resolver-builtin-repro",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { EventEmitter } from "node:events"
            export default () => <board width="10mm" height="10mm" />
          `,
        },
      }),
    ).rejects.toThrow(
      'Node.js built-in module "node:events" is not available in the tscircuit execution environment',
    )
  })

  test("preserves missing package.json error for regular undeclared npm packages", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    await expect(
      runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "regular-npm-repro",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import debounce from "lodash.debounce"
            export default () => <board width="10mm" height="10mm" />
          `,
        },
      }),
    ).rejects.toThrow(
      'Node module imported but not in package.json "lodash.debounce"',
    )
  })

  test("resolves preSuppliedImports across node: prefix and bare built-in names in evalCompiledJs", () => {
    class MockEmitter {}
    const modFromBare = evalCompiledJs(
      'const { EventEmitter } = require("node:events"); module.exports = { EventEmitter };',
      { events: { EventEmitter: MockEmitter } },
    )
    expect(modFromBare.exports.EventEmitter).toBe(MockEmitter)

    const modFromPrefixed = evalCompiledJs(
      'const { EventEmitter } = require("events"); module.exports = { EventEmitter };',
      { "node:events": { EventEmitter: MockEmitter } },
    )
    expect(modFromPrefixed.exports.EventEmitter).toBe(MockEmitter)
  })
})
