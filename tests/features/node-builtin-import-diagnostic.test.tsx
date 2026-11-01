import { describe, expect, test } from "bun:test"
import { createExecutionContext } from "lib/eval/execution-context"
import { importEvalPath } from "lib/eval/import-eval-path"
import { importNodeModule } from "lib/eval/import-node-module"
import { CircuitRunner } from "lib/runner/CircuitRunner"

describe("Node built-in import diagnostics (#5179)", () => {
  test("reports clear built-in unavailability error for node:events instead of missing package.json dependency", async () => {
    const runner = new CircuitRunner()

    let thrownError: Error | undefined
    try {
      await runner.executeWithFsMap({
        fsMap: {
          "package.json": JSON.stringify({
            name: "test-project",
            dependencies: {},
          }),
          "lib/regenerate.ts": `
            import { EventEmitter } from "node:events"
            export const emitter = new EventEmitter()
          `,
          "index.tsx": `
            import { emitter } from "./lib/regenerate"
            circuit.add(<board width="10mm" height="10mm" />)
          `,
        },
        entrypoint: "index.tsx",
      })
    } catch (error) {
      thrownError = error as Error
    }

    expect(thrownError).toBeDefined()
    expect(thrownError?.message).toContain(
      'Node built-in module "node:events" is not available in this execution environment',
    )
    expect(thrownError?.message).toContain('imported from "lib/regenerate.ts"')
    expect(thrownError?.message).toContain(
      "browser-compatible event emitter package in package.json",
    )
    expect(thrownError?.message).not.toContain(
      "Node module imported but not in package.json",
    )
  })

  test("importNodeModule also reports built-in unavailability instead of package.json error", async () => {
    const ctx = createExecutionContext({
      snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
      cjsRegistryUrl: "https://cjs.tscircuit.com",
    })
    ctx.fsMap = {
      "package.json": JSON.stringify({
        name: "test-project",
        dependencies: {},
      }),
    }
    ctx.importStack.push("index.tsx")

    let thrownError: Error | undefined
    try {
      await importNodeModule("node:events", ctx, 0, { cwd: "." })
    } catch (error) {
      thrownError = error as Error
    }

    expect(thrownError).toBeDefined()
    expect(thrownError?.message).toContain(
      'Node built-in module "node:events" is not available in this execution environment',
    )
    expect(thrownError?.message).toContain('imported from "index.tsx"')
    expect(thrownError?.message).not.toContain(
      "Node module imported but not in package.json",
    )
  })

  test("still reports undeclared npm packages as missing from package.json", async () => {
    const runner = new CircuitRunner()

    await expect(
      runner.executeWithFsMap({
        fsMap: {
          "package.json": JSON.stringify({
            name: "test-project",
            dependencies: {},
          }),
          "index.tsx": `
            import { something } from "some-undeclared-npm-pkg"
            circuit.add(<board width="10mm" height="10mm" />)
          `,
        },
        entrypoint: "index.tsx",
      }),
    ).rejects.toThrow(
      'Node module imported but not in package.json "some-undeclared-npm-pkg"',
    )
  })

  test("allows node:events when preSuppliedImports provides node:events or events", async () => {
    class MockEventEmitter {
      width = "15mm"
    }

    const ctx = createExecutionContext({
      snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
      cjsRegistryUrl: "https://cjs.tscircuit.com",
    })
    ctx.fsMap = {
      "package.json": JSON.stringify({
        name: "test-project",
        dependencies: {},
      }),
      "index.tsx": `
        import { EventEmitter } from "node:events"
        const emitter = new EventEmitter()
        export const resolvedWidth = emitter.width
      `,
    }
    ctx.preSuppliedImports.events = {
      EventEmitter: MockEventEmitter,
    }

    await importEvalPath("./index.tsx", ctx)
    expect(ctx.preSuppliedImports["index.tsx"]?.resolvedWidth).toBe("15mm")
  })
})
