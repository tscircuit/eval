import type { RootCircuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"

// Define circuit event types
export type CircuitEventData = {
  type: string
  timestamp: number
  circuit?: RootCircuit
  [key: string]: unknown
}

export type CircuitEventType =
  | "renderable:renderLifecycle:anyEvent"
  | `asyncEffect:start`
  | `asyncEffect:end`
  | `renderable:renderLifecycle:${string}`

export type CircuitEventCallback = (event: CircuitEventData) => void

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
  on: (event: CircuitEventType, callback: CircuitEventCallback) => void
  clearEventListeners: () => void
}
