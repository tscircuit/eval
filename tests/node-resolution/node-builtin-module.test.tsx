import { describe, expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

describe("node built-in module resolution", () => {
  test("distinguishes unavailable node:events built-in from undeclared npm package", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

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
            circuit.add(<board width={10} height={10} />)
          `,
        },
      })
      expect(true).toBe(false) // should not reach here
    } catch (e: any) {
      expect(e.message).toContain(
        'Node built-in module "node:events" is unavailable in this execution environment',
      )
      expect(e.message).toContain('imported by "index.tsx"')
      expect(e.message).toContain("Remedy:")
      expect(e.message).toContain("browser-compatible event emitter")
      expect(e.message).not.toContain(
        "Node module imported but not in package.json",
      )
    } finally {
      await runner.kill()
    }
  })

  test("genuinely undeclared npm package reports not in package.json error", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    try {
      await runner.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "test-pkg",
            version: "1.0.0",
            dependencies: {},
          }),
          "index.tsx": `
            import { something } from "non-existent-npm-package"
            circuit.add(<board width={10} height={10} />)
          `,
        },
      })
      expect(true).toBe(false)
    } catch (e: any) {
      expect(e.message).toContain(
        'Node module imported but not in package.json "non-existent-npm-package"',
      )
      expect(e.message).not.toContain("Node built-in module")
    } finally {
      await runner.kill()
    }
  })

  test("preserves resolution of pre-supplied node:events built-in", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    class MockEventEmitter {
      emitted = true
    }

    runner.addPreSuppliedImport("node:events", {
      EventEmitter: MockEventEmitter,
    })

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "presupplied-builtin-test",
          version: "1.0.0",
          dependencies: {},
        }),
        "index.tsx": `
          import { EventEmitter } from "node:events"
          const emitter = new EventEmitter()
          circuit.add(<board width={10} height={10} />)
        `,
      },
    })

    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()
    expect(circuitJson).toBeDefined()
    expect(circuitJson.some((e: any) => e.type === "pcb_board")).toBe(true)
    await runner.kill()
  })

  test("resolves node:events when pre-supplied as bare 'events'", async () => {
    const runner = new CircuitRunner()
    await runner.setDisableCdnLoading(true)

    class MockEventEmitter {
      emitted = true
    }

    runner.addPreSuppliedImport("events", {
      EventEmitter: MockEventEmitter,
    })

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "bare-events-alias-test",
          version: "1.0.0",
          dependencies: {},
        }),
        "index.tsx": `
          import { EventEmitter } from "node:events"
          const emitter = new EventEmitter()
          circuit.add(<board width={10} height={10} />)
        `,
      },
    })

    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()
    expect(circuitJson).toBeDefined()
    expect(circuitJson.some((e: any) => e.type === "pcb_board")).toBe(true)
    await runner.kill()
  })
})
