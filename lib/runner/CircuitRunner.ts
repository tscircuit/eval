import type { AnyCircuitElement } from "circuit-json"
import type {
  CircuitRunnerApi,
  CircuitRunnerConfiguration,
} from "lib/shared/types"
import type { PlatformConfig } from "@tscircuit/props"
import { createExecutionContext, importEvalPath } from "lib/eval"
import { normalizeFsMap } from "./normalizeFsMap"
import { getTsConfig } from "./tsconfigPaths"
import type { RootCircuit } from "@tscircuit/core"
import * as React from "react"
import { setupDefaultEntrypointIfNeeded } from "./setupDefaultEntrypointIfNeeded"
import { enhanceRootCircuitHasNoChildrenError } from "lib/utils/enhance-root-circuit-error"
import Debug from "debug"
import { setValueAtPath } from "lib/shared/obj-path"

const debug = Debug("tsci:eval:CircuitRunner")

export class CircuitRunner implements CircuitRunnerApi {
  _executionContext: ReturnType<typeof createExecutionContext> | null = null
  _circuitRunnerConfiguration: CircuitRunnerConfiguration = {
    snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
    cjsRegistryUrl: "https://cjs.tscircuit.com",
    verbose: false,
  }
  _eventListeners: Record<string, ((...args: any[]) => void)[]> = {}
  _debugNamespace: string | undefined

  constructor(configuration: Partial<CircuitRunnerConfiguration> = {}) {
    Object.assign(this._circuitRunnerConfiguration, configuration)
  }

  async version(): Promise<string> {
    return "0.0.0"
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
      Debug.enable("tsci:eval:*")
    }

    debug("executeWithFsMap called with:", {
      entrypoint: opts.entrypoint,
      fsMapKeys: Object.keys(opts.fsMap),
      name: opts.name,
    })

    setupDefaultEntrypointIfNeeded(opts)

    debug("entrypoint after setupDefaultEntrypointIfNeeded:", {
      entrypoint: opts.entrypoint,
    })

    this._executionContext = createExecutionContext(
      this._circuitRunnerConfiguration,
      {
        name: opts.name,
        platform: this._circuitRunnerConfiguration.platform,
        projectConfig: this._circuitRunnerConfiguration.projectConfig,
        debugNamespace: this._debugNamespace,
      },
    )
    this._bindEventListeners(this._executionContext.circuit)

    this._executionContext.entrypoint = opts.entrypoint!
    this._executionContext.fsMap = normalizeFsMap(opts.fsMap)
    this._executionContext.tsConfig = getTsConfig(this._executionContext.fsMap)
    if (!this._executionContext.fsMap[opts.entrypoint!]) {
      throw new Error(`Entrypoint "${opts.entrypoint}" not found`)
    }
    ;(globalThis as any).__tscircuit_circuit = this._executionContext.circuit

    const entrypoint = opts.entrypoint!.startsWith("./")
      ? opts.entrypoint
      : `./${opts.entrypoint}`

    debug("final entrypoint:", entrypoint)
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
        projectConfig: this._circuitRunnerConfiguration.projectConfig,
        debugNamespace: this._debugNamespace,
      },
    )
    this._bindEventListeners(this._executionContext.circuit)
    this._executionContext.fsMap["entrypoint.tsx"] = code
    this._executionContext.tsConfig = getTsConfig(this._executionContext.fsMap)
    ;(globalThis as any).__tscircuit_circuit = this._executionContext.circuit

    await importEvalPath("./entrypoint.tsx", this._executionContext)
  }

  async executeComponent(component: any, opts: { name?: string } = {}) {
    if (this._circuitRunnerConfiguration.verbose) {
      console.log("[CircuitRunner] executeComponent called")
    }

    this._executionContext = createExecutionContext(
      this._circuitRunnerConfiguration,
      {
        ...opts,
        platform: this._circuitRunnerConfiguration.platform,
        projectConfig: this._circuitRunnerConfiguration.projectConfig,
        debugNamespace: this._debugNamespace,
      },
    )
    this._bindEventListeners(this._executionContext.circuit)
    ;(globalThis as any).__tscircuit_circuit = this._executionContext.circuit
    this._executionContext.tsConfig = null

    const element = typeof component === "function" ? component() : component
    this._executionContext.circuit.add(element as any)
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
    try {
      await this._executionContext.circuit.renderUntilSettled()
    } catch (error) {
      throw enhanceRootCircuitHasNoChildrenError(
        error,
        this._executionContext.entrypoint,
      )
    }
  }

  async getCircuitJson(): Promise<AnyCircuitElement[]> {
    if (!this._executionContext) {
      throw new Error("No circuit has been created")
    }
    try {
      return this._executionContext.circuit.getCircuitJson()
    } catch (error) {
      throw enhanceRootCircuitHasNoChildrenError(
        error,
        this._executionContext.entrypoint,
      )
    }
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

  async setDisableCdnLoading(disable: boolean) {
    ;(this._circuitRunnerConfiguration as any).disableCdnLoading = disable
  }

  async setPlatformConfig(platform: PlatformConfig) {
    this._circuitRunnerConfiguration.platform = platform
  }

  async setPlatformConfigProperty(property: string, value: any) {
    if (!this._circuitRunnerConfiguration.platform) {
      this._circuitRunnerConfiguration.platform = {}
    }
    setValueAtPath(this._circuitRunnerConfiguration.platform, property, value)
  }

  async setProjectConfig(project: Partial<PlatformConfig>) {
    this._circuitRunnerConfiguration.projectConfig = project
  }

  async setProjectConfigProperty(property: string, value: any) {
    if (!this._circuitRunnerConfiguration.projectConfig) {
      this._circuitRunnerConfiguration.projectConfig = {}
    }
    setValueAtPath(
      this._circuitRunnerConfiguration.projectConfig,
      property,
      value,
    )
  }

  async setSessionToken(sessionToken: string | null) {
    this._circuitRunnerConfiguration.sessionToken = sessionToken ?? undefined
  }

  async enableDebug(namespace: string) {
    this._debugNamespace = namespace
    if (this._executionContext) {
      const circuit = this._executionContext.circuit as any
      circuit.enableDebug?.(namespace)
    }
  }

  private _bindEventListeners(circuit: RootCircuit) {
    for (const event in this._eventListeners) {
      for (const listener of this._eventListeners[event]) {
        circuit.on(event as any, listener as any)
      }
    }
  }
}
