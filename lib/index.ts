import type { AnyCircuitElement } from "circuit-json"
import type {
  CircuitEvaluatorConfig,
} from "lib/shared/types"
import * as React from "react"
import {
  createExecutionContext,
  type ExecutionContext,
} from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import { normalizeFsMap } from "./normalize-fs-map"
import type { RootCircuit } from "@tscircuit/core"
import Debug from "debug"
import { CircuitEvaluator } from "./CircuitEvaluator"

const debug = Debug("tscircuit:eval:index")

globalThis.React = React

// Re-export CircuitEvaluator as the main public API
export { CircuitEvaluator }

// Configuration used by CircuitEvaluator
export const defaultCircuitEvaluatorConfig: CircuitEvaluatorConfig = {
  snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
  verbose: false,
}

// Legacy web worker API, kept for backward compatibility
// New code should use CircuitEvaluator class instead
const webWorkerApi = (() => {
  let evaluator: CircuitEvaluator | null = null

  const getEvaluator = (): CircuitEvaluator => {
    if (!evaluator) {
      evaluator = new CircuitEvaluator(defaultCircuitEvaluatorConfig)
    }
    return evaluator
  }

  return {
    setSnippetsApiBaseUrl: async (baseUrl: string) => {
      defaultCircuitEvaluatorConfig.snippetsApiBaseUrl = baseUrl
    },

    executeWithFsMap: async (opts: {
      entrypoint: string
      fsMap: Record<string, string>
      name?: string
    }): Promise<void> => {
      await getEvaluator().executeWithFsMap(opts)
    },

    execute: async (code: string, opts: { name?: string } = {}): Promise<void> => {
      await getEvaluator().execute(code)
    },

    on: (event: string, callback: (...args: any[]) => void): void => {
      getEvaluator().on(event as any, callback)
    },

    renderUntilSettled: async (): Promise<void> => {
      await getEvaluator().renderUntilSettled()
    },

    getCircuitJson: async (): Promise<AnyCircuitElement[]> => {
      return getEvaluator().getCircuitJson()
    },

    clearEventListeners: (): void => {
      if (evaluator) {
        evaluator.clearEventListeners()
        evaluator = null
      }
    },
  }
})()
