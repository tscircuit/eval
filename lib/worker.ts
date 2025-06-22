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

    const workerBlob = await fetch(cdnUrl).then((res) => res.blob())
    workerBlobUrl = URL.createObjectURL(workerBlob)
  }

  const rawWorker = new Worker(workerBlobUrl, { type: "module" })
  const comlinkWorker = Comlink.wrap<InternalWebWorkerApi>(rawWorker)

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
    execute: async (...args) => {
      if (isTerminated) {
        throw new Error("CircuitWebWorker was terminated, can't execute")
      }
      return comlinkWorker.execute.bind(comlinkWorker)(...args)
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
  globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER = wrapper
  return wrapper
}
