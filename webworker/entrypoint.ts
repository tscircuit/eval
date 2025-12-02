import type { AnyCircuitElement } from "circuit-json"
import * as Comlink from "comlink"
import type {
  InternalWebWorkerApi,
  WebWorkerConfiguration,
} from "lib/shared/types"
import * as React from "react"
import type { PlatformConfig } from "@tscircuit/props"
import { createExecutionContext, type ExecutionContext } from "lib/eval"
import { importEvalPath } from "lib/eval"
import { normalizeFsMap } from "lib/runner/normalizeFsMap"
import { getTsConfig } from "lib/runner/tsconfigPaths"
import type { RootCircuit } from "@tscircuit/core"
import { setupDefaultEntrypointIfNeeded } from "lib/runner/setupDefaultEntrypointIfNeeded"
import { enhanceRootCircuitHasNoChildrenError } from "lib/utils/enhance-root-circuit-error"
import { setupFetchProxy } from "./fetchProxy"
import { setValueAtPath } from "lib/shared/obj-path"
import { prepareFilesystem } from "lib/filesystem/prepareFilesystem"
import type { FilesystemHandler } from "lib/filesystem/types"

globalThis.React = React
setupFetchProxy()

// Polyfill for Node.js global object in browser workers
// Needed because @tscircuit/core and dependencies reference global.debugGraphics/debugOutputArray
globalThis.global = globalThis.global || globalThis

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

const isMessagePort = (value: unknown): value is MessagePort => {
  return typeof (value as MessagePort | undefined)?.postMessage === "function"
}

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: any[]) => Promise<ReturnType<T[K]>>
    : T[K]
}

const webWorkerApi = {
  setSnippetsApiBaseUrl: async (baseUrl: string) => {
    circuitRunnerConfiguration.snippetsApiBaseUrl = baseUrl
  },
  setDisableCdnLoading: async (disable: boolean) => {
    circuitRunnerConfiguration.disableCdnLoading = disable
  },
  setPlatformConfig: async ($platform: Promisified<PlatformConfig>) => {
    throw new Error(
      "setPlatformConfig can't be used against the webworker directly due to comlink limitations, use setPlatformConfigProperty instead (or a wrapper)",
    )
  },
  setPlatformConfigProperty: async (property: string, value: any) => {
    if (!circuitRunnerConfiguration.platform) {
      circuitRunnerConfiguration.platform = {}
    }
    setValueAtPath(circuitRunnerConfiguration.platform, property, value)
  },
  setProjectConfig: async (project: Partial<PlatformConfig>) => {
    throw new Error(
      "setProjectConfig can't be used against the webworker directly due to comlink limitations, use setProjectConfigProperty instead (or a wrapper)",
    )
  },
  setProjectConfigProperty: async (property: string, value: any) => {
    if (!circuitRunnerConfiguration.projectConfig) {
      circuitRunnerConfiguration.projectConfig = {}
    }
    setValueAtPath(circuitRunnerConfiguration.projectConfig, property, value)
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
    fs?: FilesystemHandler | MessagePort
    fsMap?: Record<string, string>
    name?: string
    mainComponentPath?: string
    mainComponentName?: string
    mainComponentProps?: Record<string, any>
  }): Promise<void> {
    if (circuitRunnerConfiguration.verbose) {
      console.log("[Worker] executeWithFsMap called with:", {
        entrypoint: opts.entrypoint,
        name: opts.name,
      })
    }

    let fsToUse: FilesystemHandler | undefined
    if (isMessagePort(opts.fs)) {
      fsToUse = Comlink.wrap<FilesystemHandler>(opts.fs)
    } else {
      fsToUse = opts.fs
    }

    const { fs, fsMap } = await prepareFilesystem({
      fs: fsToUse,
      fsMap: opts.fsMap,
    })

    const filesystemOpts = { ...opts, fsMap }

    setupDefaultEntrypointIfNeeded(filesystemOpts)
    opts.entrypoint = filesystemOpts.entrypoint
    opts.mainComponentPath = filesystemOpts.mainComponentPath
    opts.mainComponentName = filesystemOpts.mainComponentName
    opts.mainComponentProps = filesystemOpts.mainComponentProps

    let entrypoint = opts.entrypoint!

    executionContext = createExecutionContext(circuitRunnerConfiguration, {
      name: opts.name,
      platform: circuitRunnerConfiguration.platform,
      projectConfig: circuitRunnerConfiguration.projectConfig,
      debugNamespace,
    })
    bindEventListeners(executionContext.circuit)
    executionContext.entrypoint = entrypoint
    executionContext.fs = fs
    executionContext.fsMap = normalizeFsMap(fsMap)
    executionContext.tsConfig = getTsConfig(executionContext.fsMap)
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
    await executionContext.fs.writeFile("entrypoint.tsx", code)
    executionContext.fsMap = normalizeFsMap({
      ...executionContext.fsMap,
      "entrypoint.tsx": code,
    })
    executionContext.tsConfig = getTsConfig(executionContext.fsMap)
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
    executionContext.tsConfig = null

    let element: any
    if (typeof component === "function") {
      element = component()
    } else if (component?.__isSerializedReactElement) {
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
    try {
      await executionContext.circuit.renderUntilSettled()
    } catch (error) {
      throw enhanceRootCircuitHasNoChildrenError(
        error,
        executionContext.entrypoint,
      )
    }
  },

  getCircuitJson: async (): Promise<AnyCircuitElement[]> => {
    if (!executionContext) {
      throw new Error("No circuit has been created")
    }
    try {
      return executionContext.circuit.getCircuitJson()
    } catch (error) {
      throw enhanceRootCircuitHasNoChildrenError(
        error,
        executionContext.entrypoint,
      )
    }
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
