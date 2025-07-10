import { RootCircuit } from "@tscircuit/core"
import type { WebWorkerConfiguration } from "lib/shared/types"
import * as tscircuitCore from "@tscircuit/core"
import * as React from "react"
import * as jscadFiber from "jscad-fiber"
import * as tscircuitMathUtils from "@tscircuit/math-utils"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "lib/getPlatformConfig"
import Debug from "debug"

const debug = Debug("tsci:eval:execution-context")

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
    platform?: PlatformConfig
  } = {},
): ExecutionContext {
  globalThis.React = React

  const circuit = new RootCircuit({
    platform: opts.platform || getPlatformConfig(),
  })

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
