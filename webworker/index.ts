import type { AnyCircuitElement } from "circuit-json"
import * as Comlink from "comlink"
import type {
  InternalWebWorkerApi,
  WebWorkerConfiguration,
} from "lib/shared/types"
import * as React from "react"
import {
  createExecutionContext,
  type ExecutionContext,
} from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import { normalizeFsMap } from "./normalize-fs-map"
import type { RootCircuit } from "@tscircuit/core"

globalThis.React = React

let executionContext: ExecutionContext | null = null

const webWorkerConfiguration: WebWorkerConfiguration = {
  snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
  verbose: false,
}

const eventListeners: Record<string, ((...args: any[]) => void)[]> = {}

function bindEventListeners(circuit: RootCircuit) {
  for (const event in eventListeners) {
    for (const listener of eventListeners[event]) {
      circuit.on(event as any, listener as any)
    }
  }
}

const webWorkerApi = {
  setSnippetsApiBaseUrl: async (baseUrl: string) => {
    webWorkerConfiguration.snippetsApiBaseUrl = baseUrl
  },

  async executeWithFsMap(opts: {
    entrypoint: string
    fsMap: Record<string, string>
    name?: string
  }): Promise<void> {
    if (webWorkerConfiguration.verbose) {
      console.log("[Worker] executeWithFsMap called with:", {
        entrypoint: opts.entrypoint,
        fsMapKeys: Object.keys(opts.fsMap),
        name: opts.name,
      })
    }
    executionContext = createExecutionContext(webWorkerConfiguration, {
      name: opts.name,
    })
    bindEventListeners(executionContext.circuit)
    executionContext.fsMap = normalizeFsMap(opts.fsMap)
    if (!executionContext.fsMap[opts.entrypoint]) {
      throw new Error(`Entrypoint "${opts.entrypoint}" not found`)
    }
    ;(globalThis as any).__tscircuit_circuit = executionContext.circuit

    if (!opts.entrypoint.startsWith("./")) {
      opts.entrypoint = `./${opts.entrypoint}`
    }

    await importEvalPath(opts.entrypoint, executionContext)
  },

  async execute(code: string, opts: { name?: string } = {}) {
    if (webWorkerConfiguration.verbose) {
      console.log("[Worker] execute called with code length:", code.length)
    }
    executionContext = createExecutionContext(webWorkerConfiguration, opts)
    bindEventListeners(executionContext.circuit)
    executionContext.fsMap["entrypoint.tsx"] = code
    ;(globalThis as any).__tscircuit_circuit = executionContext.circuit

    await importEvalPath("./entrypoint.tsx", executionContext)
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
} satisfies InternalWebWorkerApi

Comlink.expose(webWorkerApi)
