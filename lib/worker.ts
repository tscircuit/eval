import * as Comlink from "comlink"
export * from "./utils/index"
import type {
  InternalWebWorkerApi,
  WebWorkerConfiguration,
  CircuitWebWorker,
} from "./shared/types"
import type { RootCircuitEventName } from "@tscircuit/core"

export type { CircuitWebWorker, WebWorkerConfiguration }

declare global {
  interface Window {
    TSCIRCUIT_GLOBAL_CIRCUIT_WORKER: CircuitWebWorker | undefined
  }
  var TSCIRCUIT_GLOBAL_CIRCUIT_WORKER: CircuitWebWorker | undefined
}

export const createCircuitWebWorker = async (
  configuration: Partial<WebWorkerConfiguration>,
): Promise<CircuitWebWorker> => {
  // Kill existing global worker instance if present
  const existingWorker = globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER
  if (existingWorker && typeof existingWorker.kill === "function") {
    if (configuration.verbose) {
      console.log("[Worker] Killing previous global worker instance...")
    }
    try {
      await existingWorker.kill()
    } catch (e) {
      if (configuration.verbose) {
        console.warn(
          "[Worker] Error killing previous global worker instance:",
          e,
        )
      }
      // Ensure the key is cleared even if kill throws an error
      if (globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER === existingWorker) {
        globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER = undefined
      }
    }
  }

  if (configuration.verbose) {
    console.log(
      "[Worker] Creating circuit web worker with config:",
      configuration,
    )
  }

  let workerBlobUrl =
    configuration.webWorkerBlobUrl ?? configuration.webWorkerUrl

  if (!workerBlobUrl) {
    const cdnUrl = `https://cdn.jsdelivr.net/npm/@tscircuit/eval@${configuration.evalVersion ?? "latest"}/dist/webworker/entrypoint.js`

    const workerBlob = await globalThis.fetch(cdnUrl).then((res) => res.blob())
    workerBlobUrl = URL.createObjectURL(workerBlob)
  }

  const rawWorker = new Worker(workerBlobUrl, { type: "module" })
  let workerInitError: any
  rawWorker.addEventListener("error", (event) => {
    console.error("[Worker] Error in worker", event)
    workerInitError = event
  })
  rawWorker.addEventListener("unhandledrejection", (event) => {
    console.error("[Worker] Unhandled rejection in worker", event)
  })
  rawWorker.addEventListener("messageerror", (event) => {
    console.error("[Worker] Message error in worker", event)
  })
  const earlyMessageHandler = (event: MessageEvent) => {
    console.log("[Worker] Message in worker", event)
  }
  rawWorker.addEventListener("message", earlyMessageHandler)

  // Handle fetch requests from the worker
  rawWorker.addEventListener("message", async (event: MessageEvent) => {
    const data = event.data
    if (data?.type !== "worker_fetch") return

    try {
      const response = await globalThis.fetch(data.input, data.init)
      const body = await response.text()
      rawWorker.postMessage({
        type: "worker_fetch_result",
        requestId: data.requestId,
        success: true,
        response: {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: (() => {
            const obj: Record<string, string> = {}
            response.headers.forEach((value, key) => {
              obj[key] = value
            })
            return obj
          })(),
        },
      })
    } catch (err: any) {
      rawWorker.postMessage({
        type: "worker_fetch_result",
        requestId: data.requestId,
        success: false,
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      })
    }
  })

  if (workerInitError) {
    throw workerInitError
  }

  const comlinkWorker = Comlink.wrap<InternalWebWorkerApi>(rawWorker)

  rawWorker.removeEventListener("message", earlyMessageHandler)

  // Helper to convert a ReactElement into a factory function string
  // that can be evaluated inside the worker to recreate the element.
  function reactElementToFactoryCode(element: any): string {
    function createElementCode(el: any): string {
      if (!el || typeof el !== "object") {
        throw new Error("Invalid React element")
      }
      const type = el.type
      if (typeof type !== "string") {
        throw new Error(
          "Only intrinsic elements are supported when passing a ReactElement directly. Pass a factory function instead for component elements.",
        )
      }
      const props = { ...(el.props || {}) }
      const children = props.children
      delete (props as any).children

      const propsCode = JSON.stringify(props)
      const childArray = Array.isArray(children)
        ? children
        : children != null
          ? [children]
          : []
      const childCodes = childArray
        .filter((c) => c !== null && c !== undefined && c !== false)
        .map((c) => {
          if (
            typeof c === "string" ||
            typeof c === "number" ||
            typeof c === "boolean"
          ) {
            return JSON.stringify(c)
          }
          if (typeof c === "object") {
            return createElementCode(c)
          }
          throw new Error("Unsupported child type in React element")
        })

      const args = [`${JSON.stringify(type)}`, propsCode].concat(childCodes)
      return `React.createElement(${args.join(", ")})`
    }

    const code = createElementCode(element)
    return `(() => ${code})`
  }

  // Conditionally override global fetch inside the worker to route through the parent
  // Only enable when explicitly requested via configuration
  if (configuration.enableFetchProxy) {
    rawWorker.postMessage({ type: "override_global_fetch" })
  }

  if (configuration.snippetsApiBaseUrl) {
    await comlinkWorker.setSnippetsApiBaseUrl(configuration.snippetsApiBaseUrl)
  }
  if (configuration.platform) {
    await comlinkWorker.setPlatformConfig(configuration.platform)
  }

  let isTerminated = false

  // Create a wrapper that handles events directly through circuit instance
  const wrapper: CircuitWebWorker = {
    clearEventListeners: comlinkWorker.clearEventListeners.bind(comlinkWorker),
    version: comlinkWorker.version.bind(comlinkWorker),
    execute: async (...args) => {
      if (isTerminated) {
        throw new Error("CircuitWebWorker was terminated, can't execute")
      }
      return comlinkWorker.execute.bind(comlinkWorker)(...args)
    },
    executeComponent: async (component: any) => {
      if (isTerminated) {
        throw new Error(
          "CircuitWebWorker was terminated, can't executeComponent",
        )
      }
      let factoryCode: string
      if (typeof component === "function") {
        factoryCode = `(${component.toString()})`
      } else {
        factoryCode = reactElementToFactoryCode(component)
      }
      return comlinkWorker.executeComponent.bind(comlinkWorker)(factoryCode)
    },
    executeWithFsMap: async (...args) => {
      if (isTerminated) {
        throw new Error(
          "CircuitWebWorker was terminated, can't executeWithFsMap",
        )
      }
      return comlinkWorker.executeWithFsMap.bind(comlinkWorker)(...args)
    },
    renderUntilSettled: comlinkWorker.renderUntilSettled.bind(comlinkWorker),
    getCircuitJson: comlinkWorker.getCircuitJson.bind(comlinkWorker),
    on: (event: string, callback: (...args: any[]) => void) => {
      const proxiedCallback = Comlink.proxy(callback)
      comlinkWorker.on(event as RootCircuitEventName, proxiedCallback)
    },
    kill: async () => {
      comlinkWorker[Comlink.releaseProxy]()
      rawWorker.terminate()
      isTerminated = true
      if (globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER === wrapper) {
        globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER = undefined
      }
    },
  }
  ;(wrapper as any).__rawWorker = rawWorker
  globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER = wrapper
  return wrapper
}
