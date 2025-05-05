import type { CircuitWebWorker, WebWorkerConfiguration } from "lib/worker"

export type { CircuitWebWorker, WebWorkerConfiguration }

let activeWorker: CircuitWebWorker | null = null

export const createCircuitWebWorker = async (
  configuration: Partial<WebWorkerConfiguration>,
): Promise<CircuitWebWorker> => {
  // Return the existing active worker if it exists
  if (activeWorker) {
    if (configuration.verbose) {
      console.log("[Worker] Returning existing active worker")
    }
    return activeWorker
  }

  // Create a new worker instance
  activeWorker = await createCircuitWebWorker(configuration)
  return activeWorker
}
