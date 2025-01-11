import type { RootCircuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import * as React from "react"
import { createExecutionContext } from "./execution-context"
import { normalizeFsMap } from "./normalize-fs-map"
import type {
  CircuitEvaluatorConfig,
  CircuitEvaluator as ICircuitEvaluator,
} from "./shared/types"

const defaultCircuitEvaluatorConfig: CircuitEvaluatorConfig = {
  snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
  verbose: false,
}

export class CircuitEvaluator {
  private config: CircuitEvaluatorConfig
  private executionContext: ReturnType<typeof createExecutionContext> | null =
    null
  private eventListeners: Record<string, ((...args: any[]) => void)[]> = {}

  constructor(config?: Partial<CircuitEvaluatorConfig>) {
    this.config = { ...defaultCircuitEvaluatorConfig, ...config }
  }

  private bindEventListeners(circuit: RootCircuit) {
    for (const event in this.eventListeners) {
      for (const listener of this.eventListeners[event]) {
        circuit.on(event as any, listener as any)
      }
    }
  }

  async execute(code: string): Promise<void> {
    if (this.config.verbose) {
      console.log(
        "[CircuitEvaluator] execute called with code length:",
        code.length,
      )
    }
    this.executionContext = createExecutionContext(this.config, {})
    this.bindEventListeners(this.executionContext.circuit)
    // Use normalized paths consistently
    this.executionContext.fsMap = normalizeFsMap({ "entrypoint.tsx": code })
    ;(globalThis as any).__tscircuit_circuit = this.executionContext.circuit

    await this.importEvalPath("./entrypoint.tsx")
  }

  async executeWithFsMap(opts: {
    entrypoint: string
    fsMap: Record<string, string>
    name?: string
  }): Promise<void> {
    if (this.config.verbose) {
      console.log("[CircuitEvaluator] executeWithFsMap called with:", {
        entrypoint: opts.entrypoint,
        fsMapKeys: Object.keys(opts.fsMap),
        name: opts.name,
      })
    }
    this.executionContext = createExecutionContext(this.config, {
      name: opts.name,
    })
    this.bindEventListeners(this.executionContext.circuit)

    // Normalize fsMap paths using the standard normalizer
    this.executionContext.fsMap = normalizeFsMap(opts.fsMap)

    // Normalize entrypoint path
    const entrypoint = opts.entrypoint.replace(/^\.?\//, "")
    if (!this.executionContext.fsMap[entrypoint]) {
      throw new Error(`Entrypoint "${opts.entrypoint}" not found`)
    }
    ;(globalThis as any).__tscircuit_circuit = this.executionContext.circuit

    await this.importEvalPath(`./${entrypoint}`)
  }

  async renderUntilSettled(): Promise<void> {
    if (!this.executionContext) {
      throw new Error("No circuit has been created")
    }
    await this.executionContext.circuit.renderUntilSettled()
  }

  async getCircuitJson(): Promise<AnyCircuitElement[]> {
    if (!this.executionContext) {
      throw new Error("No circuit has been created")
    }
    return this.executionContext.circuit.getCircuitJson()
  }

  on(
    event:
      | "renderable:renderLifecycle:anyEvent"
      | `asyncEffect:start`
      | `asyncEffect:end`
      | `renderable:renderLifecycle:${string}`,
    callback: (...args: any[]) => void,
  ): void {
    this.eventListeners[event] ??= []
    this.eventListeners[event].push(callback)
    this.executionContext?.circuit.on(event as any, callback)
  }

  clearEventListeners(): void {
    // If there's an active circuit, try to unbind all listeners
    if (this.executionContext?.circuit) {
      for (const event in this.eventListeners) {
        for (const listener of this.eventListeners[event]) {
          const circuit = this.executionContext.circuit as unknown as {
            removeListener?: (
              event: string,
              listener: (...args: any[]) => void,
            ) => void
          }
          if (typeof circuit.removeListener === "function") {
            circuit.removeListener(event, listener)
          }
        }
      }
    }

    // Clear all stored event listeners
    for (const event in this.eventListeners) {
      delete this.eventListeners[event]
    }
  }

  private async importEvalPath(path: string) {
    const { importEvalPath } = await import("./import-eval-path")
    if (!this.executionContext) throw new Error("No execution context")
    await importEvalPath(path, this.executionContext)
  }
}
