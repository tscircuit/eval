import type { AnyCircuitElement } from "circuit-json"
import * as Comlink from "comlink"
export * from "./utils/index"
import type {
  InternalWebWorkerApi,
  WebWorkerConfiguration,
  CircuitWebWorker,
} from "./shared/types"
import type { RootCircuitEventName } from "@tscircuit/core"

export type { CircuitWebWorker, WebWorkerConfiguration }

export const createCircuitWebWorker = async (
  configuration: Partial<WebWorkerConfiguration>,
): Promise<CircuitWebWorker> => {
  if (configuration.verbose) {
    console.log(
      "[Worker] Creating circuit web worker with config:",
      configuration,
    )
  }

  let workerBlobUrl =
    configuration.webWorkerBlobUrl ?? configuration.webWorkerUrl

  if (!workerBlobUrl) {
    const cdnUrl =
      "https://cdn.jsdelivr.net/npm/@tscircuit/eval/dist/webworker/index.js"

    const workerBlob = await fetch(cdnUrl).then((res) => res.blob())
    workerBlobUrl = URL.createObjectURL(workerBlob)
  }

  const rawWorker = new Worker(workerBlobUrl, { type: "module" })
  const comlinkWorker = Comlink.wrap<InternalWebWorkerApi>(rawWorker)

  if (configuration.snippetsApiBaseUrl) {
    await comlinkWorker.setSnippetsApiBaseUrl(configuration.snippetsApiBaseUrl)
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
    },
  }

  return wrapper
}
