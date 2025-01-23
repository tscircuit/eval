import { RootCircuit } from "@tscircuit/core"
import type { WebWorkerConfiguration } from "lib/shared/types"
import * as tscircuitCore from "@tscircuit/core"
import * as React from "react"
import * as jscadFiber from "jscad-fiber"
import * as tscircuitMathUtils from "@tscircuit/math-utils"

export interface ExecutionContext extends WebWorkerConfiguration {
  fsMap: Record<string, string>
  entrypoint: string
  preSuppliedImports: Record<string, any>
  circuit: RootCircuit
}

export function createExecutionContext(
  webWorkerConfiguration: WebWorkerConfiguration,
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
      tscircuit: tscircuitCore,
      "@tscircuit/math-utils": tscircuitMathUtils,
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
