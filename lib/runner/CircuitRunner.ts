import type { AnyCircuitElement } from "circuit-json"
import type {
  CircuitRunnerApi,
  CircuitRunnerConfiguration,
} from "lib/shared/types"
import type { PlatformConfig } from "@tscircuit/props"
import { createExecutionContext } from "../../webworker/execution-context"
import { normalizeFsMap } from "./normalizeFsMap"
import type { RootCircuit } from "@tscircuit/core"
import * as React from "react"
import { importEvalPath } from "webworker/import-eval-path"
import { setupDefaultEntrypointIfNeeded } from "./setupDefaultEntrypointIfNeeded"

export class CircuitRunner implements CircuitRunnerApi {
  _executionContext: ReturnType<typeof createExecutionContext> | null = null
  _circuitRunnerConfiguration: CircuitRunnerConfiguration = {
    snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
    cjsRegistryUrl: "https://cjs.tscircuit.com",
    verbose: false,
  }
  _eventListeners: Record<string, ((...args: any[]) => void)[]> = {}

  constructor(configuration: Partial<CircuitRunnerConfiguration> = {}) {
    Object.assign(this._circuitRunnerConfiguration, configuration)
  }

  async executeWithFsMap(ogOpts: {
    entrypoint?: string
    mainComponentPath?: string
    mainComponentName?: string
    fsMap: Record<string, string>
    name?: string
    mainComponentProps?: Record<string, any>
  }): Promise<void> {
    const opts = { ...ogOpts }
    if (this._circuitRunnerConfiguration.verbose) {
      console.log("[CircuitRunner] executeWithFsMap called with:", {
        entrypoint: opts.entrypoint,
        fsMapKeys: Object.keys(opts.fsMap),
        name: opts.name,
      })
    }

    setupDefaultEntrypointIfNeeded(opts)

    this._executionContext = createExecutionContext(
      this._circuitRunnerConfiguration,
      {
        name: opts.name,
        platform: this._circuitRunnerConfiguration.platform,
      },
    )
    this._bindEventListeners(this._executionContext.circuit)

    this._executionContext.fsMap = normalizeFsMap(opts.fsMap)
    if (!this._executionContext.fsMap[opts.entrypoint!]) {
      throw new Error(`Entrypoint "${opts.entrypoint}" not found`)
    }
    ;(globalThis as any).__tscircuit_circuit = this._executionContext.circuit

    const entrypoint = opts.entrypoint!.startsWith("./")
      ? opts.entrypoint
      : `./${opts.entrypoint}`

    await importEvalPath(entrypoint!, this._executionContext)
  }

  async execute(code: string, opts: { name?: string } = {}) {
    if (this._circuitRunnerConfiguration.verbose) {
      console.log(
        "[CircuitRunner] execute called with code length:",
        code.length,
      )
    }

    this._executionContext = createExecutionContext(
      this._circuitRunnerConfiguration,
      {
        ...opts,
        platform: this._circuitRunnerConfiguration.platform,
      },
    )
    this._bindEventListeners(this._executionContext.circuit)
    this._executionContext.fsMap["entrypoint.tsx"] = code
    ;(globalThis as any).__tscircuit_circuit = this._executionContext.circuit

    await importEvalPath("./entrypoint.tsx", this._executionContext)
  }

  on(event: string, callback: (...args: any[]) => void) {
    this._eventListeners[event] ??= []
    this._eventListeners[event].push(callback)
    this._executionContext?.circuit.on(event as any, callback)
  }

  async renderUntilSettled(): Promise<void> {
    if (!this._executionContext) {
      throw new Error("No circuit has been created")
    }
    await this._executionContext.circuit.renderUntilSettled()
  }

  async getCircuitJson(): Promise<AnyCircuitElement[]> {
    if (!this._executionContext) {
      throw new Error("No circuit has been created")
    }
    return this._executionContext.circuit.getCircuitJson()
  }

  clearEventListeners() {
    if (this._executionContext?.circuit) {
      for (const event in this._eventListeners) {
        for (const listener of this._eventListeners[event]) {
          const circuit = this._executionContext.circuit as unknown as {
            // biome-ignore lint/complexity/noBannedTypes: <explanation>
            removeListener?: (event: string, listener: Function) => void
          }
          circuit.removeListener?.(event, listener)
        }
      }
    }

    for (const event in this._eventListeners) {
      delete this._eventListeners[event]
    }
  }

  async kill() {
    // Cleanup resources
    this._executionContext = null
  }

  async setSnippetsApiBaseUrl(baseUrl: string) {
    this._circuitRunnerConfiguration.snippetsApiBaseUrl = baseUrl
  }

  async setPlatformConfig(platform: PlatformConfig) {
    this._circuitRunnerConfiguration.platform = platform
  }

  private _bindEventListeners(circuit: RootCircuit) {
    for (const event in this._eventListeners) {
      for (const listener of this._eventListeners[event]) {
        circuit.on(event as any, listener as any)
      }
    }
  }
}
