import type { AnyCircuitElement } from "circuit-json"
import * as Comlink from "comlink"
import type {
  InternalWebWorkerApi,
  WebWorkerConfiguration,
} from "lib/shared/types"
import * as React from "react"
import type { PlatformConfig } from "@tscircuit/props"
import {
  createExecutionContext,
  type ExecutionContext,
} from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import { normalizeFsMap } from "lib/runner/normalizeFsMap"
import type { RootCircuit } from "@tscircuit/core"
import { setupDefaultEntrypointIfNeeded } from "lib/runner/setupDefaultEntrypointIfNeeded"
import { setupFetchProxy } from "./fetchProxy"

globalThis.React = React
setupFetchProxy()

let executionContext: ExecutionContext | null = null
let debugNamespace: string | undefined

const circuitRunnerConfiguration: WebWorkerConfiguration = {
  snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
  cjsRegistryUrl: "https://cjs.tscircuit.com",
  verbose: false,
  platform: undefined,
  projectConfig: undefined,
}

const eventListeners: Record<string, ((...args: any[]) => void)[]> = {}

// Helper to deserialize React elements from cross-worker communication
function deserializeReactElement(serialized: any): any {
  if (!serialized || typeof serialized !== "object") {
    return serialized
  }

  if (serialized.__isSerializedReactElement) {
    const props = deserializeProps(serialized.props)
    return React.createElement(serialized.type, props)
  }

  return serialized
}

function deserializeProps(props: any): any {
  if (!props || typeof props !== "object") {
    return props
  }

  const deserialized: any = {}
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      if (Array.isArray(value)) {
        deserialized.children = value.map(deserializeReactElement)
      } else {
        deserialized.children = deserializeReactElement(value)
      }
    } else {
      deserialized[key] = value
    }
  }
  return deserialized
}

function bindEventListeners(circuit: RootCircuit) {
  for (const event in eventListeners) {
    for (const listener of eventListeners[event]) {
      circuit.on(event as any, listener as any)
    }
  }
}

const webWorkerApi = {
  setSnippetsApiBaseUrl: async (baseUrl: string) => {
    circuitRunnerConfiguration.snippetsApiBaseUrl = baseUrl
  },
  setPlatformConfig: async (platform: PlatformConfig) => {
    circuitRunnerConfiguration.platform = platform
  },
  setProjectConfig: async (project: Partial<PlatformConfig>) => {
    circuitRunnerConfiguration.projectConfig = project
  },

  enableDebug: async (namespace: string) => {
    debugNamespace = namespace
    if (executionContext) {
      const circuit = executionContext.circuit as any
      circuit.enableDebug?.(namespace)
    }
  },

  version: async () => {
    return "0.0.0"
  },

  async executeWithFsMap(opts: {
    entrypoint?: string
    fsMap: Record<string, string>
    name?: string
  }): Promise<void> {
    if (circuitRunnerConfiguration.verbose) {
      console.log("[Worker] executeWithFsMap called with:", {
        entrypoint: opts.entrypoint,
        fsMapKeys: Object.keys(opts.fsMap),
        name: opts.name,
      })
    }

    setupDefaultEntrypointIfNeeded(opts)

    let entrypoint = opts.entrypoint!

    executionContext = createExecutionContext(circuitRunnerConfiguration, {
      name: opts.name,
      platform: circuitRunnerConfiguration.platform,
      projectConfig: circuitRunnerConfiguration.projectConfig,
      debugNamespace,
    })
    bindEventListeners(executionContext.circuit)
    executionContext.fsMap = normalizeFsMap(opts.fsMap)

    // Parse tsconfig paths if tsconfig.json exists in fsMap
    const { parseTsconfigPaths } = await import(
      "lib/utils/parse-tsconfig-paths"
    )
    executionContext.tsconfigPaths = parseTsconfigPaths(executionContext.fsMap)
    if (!executionContext.fsMap[entrypoint]) {
      throw new Error(`Entrypoint "${opts.entrypoint}" not found`)
    }
    ;(globalThis as any).__tscircuit_circuit = executionContext.circuit

    if (!entrypoint.startsWith("./")) {
      entrypoint = `./${entrypoint}`
    }

    await importEvalPath(entrypoint, executionContext)
  },

  async execute(code: string, opts: { name?: string } = {}) {
    if (circuitRunnerConfiguration.verbose) {
      console.log("[Worker] execute called with code length:", code.length)
    }
    executionContext = createExecutionContext(circuitRunnerConfiguration, {
      ...opts,
      platform: circuitRunnerConfiguration.platform,
      projectConfig: circuitRunnerConfiguration.projectConfig,
      debugNamespace,
    })
    bindEventListeners(executionContext.circuit)
    executionContext.fsMap["entrypoint.tsx"] = code
    ;(globalThis as any).__tscircuit_circuit = executionContext.circuit

    await importEvalPath("./entrypoint.tsx", executionContext)
  },

  async executeComponent(component: any, opts: { name?: string } = {}) {
    if (circuitRunnerConfiguration.verbose) {
      console.log("[Worker] executeComponent called")
    }
    executionContext = createExecutionContext(circuitRunnerConfiguration, {
      ...opts,
      platform: circuitRunnerConfiguration.platform,
      projectConfig: circuitRunnerConfiguration.projectConfig,
      debugNamespace,
    })
    bindEventListeners(executionContext.circuit)
    ;(globalThis as any).__tscircuit_circuit = executionContext.circuit

    let element: any
    if (typeof component === "function") {
      element = component()
    } else if (component && component.__isSerializedReactElement) {
      element = deserializeReactElement(component)
    } else {
      element = component
    }
    executionContext.circuit.add(element as any)
  },

  on: (event: string, callback: (...args: any[]) => void) => {
    eventListeners[event] ??= []
    eventListeners[event].push(callback)
    executionContext?.circuit.on(event as any, callback)
  },

  renderUntilSettled: async (): Promise<void> => {
    if (!executionContext) {
      throw new Error("No circuit has been created")
    }
    await executionContext.circuit.renderUntilSettled()
  },

  getCircuitJson: async (): Promise<AnyCircuitElement[]> => {
    if (!executionContext) {
      throw new Error("No circuit has been created")
    }
    return executionContext.circuit.getCircuitJson()
  },

  clearEventListeners: () => {
    // If there's an active circuit, try to unbind all listeners
    if (executionContext?.circuit) {
      for (const event in eventListeners) {
        for (const listener of eventListeners[event]) {
          const circuit = executionContext.circuit as unknown as {
            removeListener?: (
              event: string,
              listener: (...args: any[]) => void,
            ) => void
          }
          if (circuit.removeListener) {
            circuit.removeListener(event, listener)
          }
        }
      }
    }

    // Clear all stored event listeners
    for (const event in eventListeners) {
      delete eventListeners[event]
    }
  },

  // Required by InternalWebWorkerApi interface but never called
  // Worker termination is handled by the main thread
  kill: async () => {},
} satisfies InternalWebWorkerApi

Comlink.expose(webWorkerApi)
