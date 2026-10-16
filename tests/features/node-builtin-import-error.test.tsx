import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import { createExecutionContext, importEvalPath } from "lib/eval"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("reports unavailable node:events built-in with importing file and remedy instead of undeclared package.json dependency", async () => {
  const runner = new CircuitRunner()
  await runner.setDisableCdnLoading(true)

  try {
    let thrownError: Error | undefined
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
            const emitter = new EventEmitter()
            export default () => <board width={10} height={10} />
          `,
        },
      })
    } catch (err) {
      thrownError = err as Error
    }

    expect(thrownError).toBeDefined()
    expect(thrownError!.message).not.toContain(
      'Node module imported but not in package.json "node:events"',
    )
    expect(thrownError!.message).toContain(
      'Node built-in module "node:events" (imported from "index.tsx") is not available in this execution environment.',
    )
    expect(thrownError!.message).toContain("event emitter")
  } finally {
    await runner.kill()
  }
})

test("importNodeModule path with nodeModulesResolver also reports unavailable node:events built-in instead of undeclared package.json error", async () => {
  const runner = new CircuitRunner({
    platform: {
      nodeModulesResolver: async () => null,
    },
  })
  await runner.setDisableCdnLoading(true)

  try {
    await expect(
      runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "builtin-import-repro",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { EventEmitter } from "node:events"
            const emitter = new EventEmitter()
            export default () => <board width={10} height={10} />
          `,
        },
      }),
    ).rejects.toThrow(
      /Node built-in module "node:events" \(imported from "index\.tsx"\) is not available in this execution environment\./,
    )
  } finally {
    await runner.kill()
  }
})

test("preserves resolution of pre-supplied Node built-ins", async () => {
  const ctx = createExecutionContext({
    snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
    cjsRegistryUrl: "https://cjs.tscircuit.com",
  })
  ctx.disableCdnLoading = true
  ctx.entrypoint = "index.tsx"
  ctx.fsMap = {
    "package.json": JSON.stringify({
      name: "builtin-presupplied-repro",
      version: "1.0.0",
      dependencies: {},
    }),
    "index.tsx": `
      import { EventEmitter } from "node:events"
      const emitter = new EventEmitter()
      let fired = false
      emitter.on("ping", () => { fired = true })
      emitter.emit("ping")
      if (!fired) throw new Error("EventEmitter did not fire")
      export const ok = fired
    `,
  }
  ctx.preSuppliedImports["events"] = { EventEmitter }

  await importEvalPath("./index.tsx", ctx)
  expect(ctx.preSuppliedImports["index.tsx"]?.ok).toBe(true)
})
