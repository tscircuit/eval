import type { AnyCircuitElement } from "circuit-json"

export interface CircuitEvaluatorConfig {
  snippetsApiBaseUrl: string
  webWorkerUrl?: URL | string
  verbose?: boolean
}

export type CircuitEvaluator = {
  execute: (code: string) => Promise<void>
  executeWithFsMap: (opts: {
    entrypoint: string
    fsMap: Record<string, string>
  }) => Promise<void>
  renderUntilSettled: () => Promise<void>
  getCircuitJson: () => Promise<AnyCircuitElement[]>
  on: (
    event:
      | "renderable:renderLifecycle:anyEvent"
      | `asyncEffect:start`
      | `asyncEffect:end`
      | `renderable:renderLifecycle:${string}`,
    callback: (...args: any[]) => void,
  ) => void
  clearEventListeners: () => void
}
