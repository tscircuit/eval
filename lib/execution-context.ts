import { RootCircuit } from "@tscircuit/core"
import * as tscircuitCore from "@tscircuit/core"
import * as jscadFiber from "jscad-fiber"
import type { CircuitEvaluatorConfig } from "lib/shared/types"
import * as React from "react"

export interface ExecutionContext extends CircuitEvaluatorConfig {
  fsMap: Record<string, string>
  entrypoint: string
  preSuppliedImports: Record<string, any>
  circuit: RootCircuit
}

export function createExecutionContext(
  webWorkerConfiguration: CircuitEvaluatorConfig,
  opts: {
    name?: string
  } = {},
): ExecutionContext {
  const circuit = new RootCircuit()

  if (opts.name) {
    circuit.name = opts.name
  }

  return {
    fsMap: {},
    entrypoint: "",
    preSuppliedImports: {
      "@tscircuit/core": tscircuitCore,
      react: React,
      "jscad-fiber": jscadFiber,

      // This is usually used as a type import, we can remove the shim when we
      // ignore type imports in getImportsFromCode
      "@tscircuit/props": {},
    },
    circuit,
    ...webWorkerConfiguration,
  }
}
