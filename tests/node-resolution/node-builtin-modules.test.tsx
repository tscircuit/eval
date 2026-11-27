import { describe, expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import { createExecutionContext, importNodeModule } from "lib/eval"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import type { WebWorkerConfiguration } from "lib/shared/types"

describe("node built-in module resolution and diagnostics", () => {
  test("reports unavailable node:events built-in with importing file and remedy instead of undeclared package.json dependency", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    try {
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
              const emitter = new EventEmitter()
              export default () => <board width={10} height={10} />
            `,
          },
        })
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).toBeDefined()
      expect(caughtError!.message).not.toContain("not in package.json")
      expect(caughtError!.message).toContain(
        'Node.js built-in module "node:events"',
      )
      expect(caughtError!.message).toContain('imported by "index.tsx"')
      expect(caughtError!.message).toContain(
        "not available in this execution environment",
      )
      expect(caughtError!.message).toMatch(/event emitter|browser entrypoint/i)
    } finally {
      await runner.kill()
    }
  })

  test("identifies nested importing file and does not attempt CDN fallback for node:* specifiers", async () => {
    const runner = new CircuitRunner()

    try {
      let caughtError: Error | undefined
      try {
        await runner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "nested-router-repro",
              version: "1.0.0",
              dependencies: {},
            }),
            "index.tsx": `
              import { createRouter } from "./routers/custom-router"
              createRouter()
              export default () => <board width="10mm" height="10mm" />
            `,
            "routers/custom-router.ts": `
              import { EventEmitter } from "node:events"
              export const createRouter = () => new EventEmitter()
            `,
          },
        })
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).toBeDefined()
      expect(caughtError!.message).not.toContain("not in package.json")
      expect(caughtError!.message).toContain(
        'Node.js built-in module "node:events"',
      )
      expect(caughtError!.message).toContain(
        'imported by "routers/custom-router.ts"',
      )
      expect(caughtError!.message).toContain(
        "not available in this execution environment",
      )
    } finally {
      await runner.kill()
    }
  })

  test("still reports unavailable built-in if node:events is mistakenly listed in package.json", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    try {
      await expect(
        runner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "invalid-workaround-repro",
              version: "1.0.0",
              dependencies: {
                "node:events": "*",
              },
            }),
            "index.tsx": `
              import { EventEmitter } from "node:events"
              const emitter = new EventEmitter()
              export default () => <board width={10} height={10} />
            `,
          },
        }),
      ).rejects.toThrow(
        /Node\.js built-in module "node:events".*not available in this execution environment/,
      )
    } finally {
      await runner.kill()
    }
  })

  test("distinguishes undeclared bare Node built-ins from genuinely undeclared npm packages", async () => {
    const builtinRunner = new CircuitRunner()
    await builtinRunner.setDisableCdnLoading(true)

    try {
      let builtinError: Error | undefined
      try {
        await builtinRunner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "bare-fs-repro",
              version: "1.0.0",
              dependencies: {},
            }),
            "index.tsx": `
              import fs from "fs"
              export default () => <board width={10} height={10} />
            `,
          },
        })
      } catch (error) {
        builtinError = error as Error
      }

      expect(builtinError).toBeDefined()
      expect(builtinError!.message).not.toContain("not in package.json")
      expect(builtinError!.message).toContain('Node.js built-in module "fs"')
      expect(builtinError!.message).toContain('imported by "index.tsx"')
    } finally {
      await builtinRunner.kill()
    }

    const npmRunner = new CircuitRunner()
    await npmRunner.setDisableCdnLoading(true)

    try {
      await expect(
        npmRunner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "undeclared-npm-repro",
              version: "1.0.0",
              dependencies: {},
            }),
            "index.tsx": `
              import { helper } from "genuinely-undeclared-npm-pkg"
              export default () => <board width={10} height={10} />
            `,
          },
        }),
      ).rejects.toThrow(
        /Node module imported but not in package\.json "genuinely-undeclared-npm-pkg"/,
      )
    } finally {
      await npmRunner.kill()
    }
  })

  test("preserves normal resolution when a browser-compatible 'events' package is declared in package.json", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    try {
      await runner.executeWithFsMap({
        mainComponentPath: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "declared-events-polyfill",
            version: "1.0.0",
            dependencies: {
              events: "^3.3.0",
            },
          }),
          "node_modules/events/package.json": JSON.stringify({
            name: "events",
            version: "3.3.0",
            main: "index.js",
          }),
          "node_modules/events/index.js": `
            export class EventEmitter {
              width = 12
            }
          `,
          "index.tsx": `
            import { EventEmitter } from "events"
            const emitter = new EventEmitter()
            export default () => <board width={emitter.width} height={10} />
          `,
        },
      })
      await runner.renderUntilSettled()
      const circuitJson = await runner.getCircuitJson()
      const board = circuitJson.find((el) => el.type === "pcb_board") as any
      expect(board).toBeDefined()
      expect(board.width).toBe(12)
    } finally {
      await runner.kill()
    }

    const mixedRunner = new CircuitRunner()
    await mixedRunner.setDisableCdnLoading(true)

    try {
      await expect(
        mixedRunner.executeWithFsMap({
          mainComponentPath: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "declared-events-plus-node-events",
              version: "1.0.0",
              dependencies: {
                events: "^3.3.0",
              },
            }),
            "node_modules/events/package.json": JSON.stringify({
              name: "events",
              version: "3.3.0",
              main: "index.js",
            }),
            "node_modules/events/index.js": `
              export class EventEmitter {}
            `,
            "use-npm-events.ts": `
              import { EventEmitter } from "events"
              export const npmEmitter = new EventEmitter()
            `,
            "use-node-events.ts": `
              import { EventEmitter } from "node:events"
              export const nodeEmitter = new EventEmitter()
            `,
            "index.tsx": `
              import "./use-npm-events"
              import "./use-node-events"
              export default () => <board width={10} height={10} />
            `,
          },
        }),
      ).rejects.toThrow(
        /Node\.js built-in module "node:events" \(imported by "use-node-events\.ts"\) is not available in this execution environment/,
      )
    } finally {
      await mixedRunner.kill()
    }
  })

  test("preserves resolution of pre-supplied built-ins across both node:* and bare specifiers", async () => {
    const runnerWithPrefixed = new CircuitRunner({
      preSuppliedImports: {
        "node:events": { EventEmitter },
      },
    })
    await runnerWithPrefixed.setDisableCdnLoading(true)

    try {
      await runnerWithPrefixed.executeWithFsMap({
        mainComponentPath: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "presupplied-prefixed",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { EventEmitter as PrefixedEmitter } from "node:events"
            import { EventEmitter as BareEmitter } from "events"

            const emitter = new PrefixedEmitter()
            let width = 0
            emitter.on("ready", (value: number) => {
              width = value
            })
            emitter.emit("ready", BareEmitter === PrefixedEmitter ? 15 : 5)

            export default () => <board width={width} height={10} />
          `,
        },
      })
      await runnerWithPrefixed.renderUntilSettled()
      const circuitJson = await runnerWithPrefixed.getCircuitJson()
      const board = circuitJson.find((el) => el.type === "pcb_board") as any
      expect(board).toBeDefined()
      expect(board.width).toBe(15)
    } finally {
      await runnerWithPrefixed.kill()
    }

    const runnerWithBare = new CircuitRunner({
      preSuppliedImports: {
        events: { EventEmitter },
      },
    })
    await runnerWithBare.setDisableCdnLoading(true)

    try {
      await runnerWithBare.executeWithFsMap({
        mainComponentPath: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "presupplied-bare",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { EventEmitter } from "node:events"
            const emitter = new EventEmitter()
            let height = 0
            emitter.on("size", (v: number) => {
              height = v
            })
            emitter.emit("size", 18)
            export default () => <board width={10} height={height} />
          `,
        },
      })
      await runnerWithBare.renderUntilSettled()
      const circuitJson = await runnerWithBare.getCircuitJson()
      const board = circuitJson.find((el) => el.type === "pcb_board") as any
      expect(board).toBeDefined()
      expect(board.height).toBe(18)
    } finally {
      await runnerWithBare.kill()
    }
  })

  test("importNodeModule recognizes node:events directly and supports nodeModulesResolver", async () => {
    const ctx = createExecutionContext({
      snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
      cjsRegistryUrl: "https://cjs.tscircuit.com",
    })
    ctx.fsMap["package.json"] = JSON.stringify({
      name: "direct-import-node-module",
      version: "1.0.0",
      dependencies: {},
    })
    ctx.importStack.push("src/router.ts")

    await expect(importNodeModule("node:events", ctx)).rejects.toThrow(
      /Node\.js built-in module "node:events" \(imported by "src\/router\.ts"\) is not available in this execution environment/,
    )

    const ctxWithResolver = createExecutionContext(
      {
        snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
        cjsRegistryUrl: "https://cjs.tscircuit.com",
      },
      {
        platform: {
          nodeModulesResolver: async (moduleName: string) => {
            if (moduleName === "node:events") {
              return "export class EventEmitter {}"
            }
            return null as any
          },
        },
      },
    )
    ctxWithResolver.fsMap["package.json"] = JSON.stringify({
      name: "resolver-provided-builtin",
      version: "1.0.0",
      dependencies: {},
    })

    await importNodeModule("node:events", ctxWithResolver)
    expect(ctxWithResolver.preSuppliedImports["node:events"]).toBeDefined()
    expect(
      typeof ctxWithResolver.preSuppliedImports["node:events"].EventEmitter,
    ).toBe("function")
  })

  test("diagnoses bare built-ins before CDN fallback when package.json is absent and CDN loading is enabled", async () => {
    const originalFetch = globalThis.fetch
    const requestedUrls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(input.toString())
      throw new Error(`Unexpected CDN fetch: ${input.toString()}`)
    }) as unknown as typeof fetch

    const runner = new CircuitRunner()
    try {
      let caughtError: Error | undefined
      try {
        await runner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "index.tsx": `
              import fs from "fs"
              export default () => <board width={10} height={10} />
            `,
          },
        })
      } catch (error) {
        caughtError = error as Error
      }

      expect(requestedUrls).toEqual([])
      expect(caughtError).toBeDefined()
      expect(caughtError!.message).toContain(
        'Node.js built-in module "fs" (imported by "index.tsx") is not available in this execution environment',
      )
    } finally {
      globalThis.fetch = originalFetch
      await runner.kill()
    }
  })

  test("resolver-loaded bare npm polyfills do not satisfy subsequent node:* imports", async () => {
    const runner = new CircuitRunner({
      platform: {
        nodeModulesResolver: async (moduleName: string) => {
          if (moduleName === "events") {
            return "export class EventEmitter {}"
          }
          return null as any
        },
      },
    })
    await runner.setDisableCdnLoading(true)

    try {
      await expect(
        runner.executeWithFsMap({
          mainComponentPath: "index.tsx",
          fsMap: {
            "package.json": JSON.stringify({
              name: "resolver-events-plus-node-events",
              version: "1.0.0",
              dependencies: {
                events: "^3.3.0",
              },
            }),
            "use-npm-events.ts": `
              import { EventEmitter } from "events"
              export const npmEmitter = new EventEmitter()
            `,
            "use-node-events.ts": `
              import { EventEmitter } from "node:events"
              export const nodeEmitter = new EventEmitter()
            `,
            "index.tsx": `
              import "./use-npm-events"
              import "./use-node-events"
              export default () => <board width={10} height={10} />
            `,
          },
        }),
      ).rejects.toThrow(
        /Node\.js built-in module "node:events" \(imported by "use-node-events\.ts"\) is not available in this execution environment/,
      )
    } finally {
      await runner.kill()
    }
  })

  test("keeps in-process preSuppliedImports out of WebWorkerConfiguration", () => {
    const validWorkerConfig: Partial<WebWorkerConfiguration> = {
      disableCdnLoading: true,
    }
    expect(validWorkerConfig.disableCdnLoading).toBe(true)

    const invalidWorkerConfig: Partial<WebWorkerConfiguration> = {
      // @ts-expect-error preSuppliedImports cannot be cloned across WebWorker boundaries
      preSuppliedImports: {
        "node:events": { EventEmitter },
      },
    }
    expect(invalidWorkerConfig).toBeDefined()
  })

  test("propagates transitive UnsupportedNodeBuiltinError from resolver-loaded packages instead of falling back to CDN", async () => {
    const originalFetch = globalThis.fetch
    const requestedUrls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(input.toString())
      throw new Error(`Unexpected CDN fetch: ${input.toString()}`)
    }) as unknown as typeof fetch

    const runner = new CircuitRunner({
      platform: {
        nodeModulesResolver: async (moduleName: string) => {
          if (moduleName === "custom-router-pkg") {
            return `
              import fs from "node:fs"
              export const readBoard = () => fs
            `
          }
          return null as any
        },
      },
    })

    try {
      let caughtError: Error | undefined
      try {
        await runner.executeWithFsMap({
          entrypoint: "index.tsx",
          fsMap: {
            "index.tsx": `
              import { readBoard } from "custom-router-pkg"
              readBoard()
              export default () => <board width={10} height={10} />
            `,
          },
        })
      } catch (error) {
        caughtError = error as Error
      }

      expect(requestedUrls).toEqual([])
      expect(caughtError).toBeDefined()
      expect(caughtError!.message).toContain(
        'Node.js built-in module "node:fs" (imported by "node_modules/custom-router-pkg.ts") is not available in this execution environment',
      )
    } finally {
      globalThis.fetch = originalFetch
      await runner.kill()
    }
  })
})
