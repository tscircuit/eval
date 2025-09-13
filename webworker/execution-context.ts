import { RootCircuit } from "@tscircuit/core"
import type { WebWorkerConfiguration } from "lib/shared/types"
import * as tscircuitCore from "@tscircuit/core"
import * as React from "react"
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
    projectSettings?: Partial<PlatformConfig>
    debugNamespace?: string
  } = {},
): ExecutionContext {
  globalThis.React = React

  const basePlatform = opts.platform || getPlatformConfig()
  const platform = opts.projectSettings
    ? { ...basePlatform, ...opts.projectSettings }
    : basePlatform

  const circuit = new RootCircuit({
    platform,
  })

  if (opts.name) {
    circuit.name = opts.name
  }

  if (opts.debugNamespace) {
    circuit.enableDebug(opts.debugNamespace)
  }

  return {
    fsMap: {},
    entrypoint: "",
    preSuppliedImports: {
      "@tscircuit/core": tscircuitCore,
      tscircuit: tscircuitCore,
      "@tscircuit/math-utils": tscircuitMathUtils,
      react: React,
      debug: Debug,

      // This is usually used as a type import, we can remove the shim when we
      // ignore type imports in getImportsFromCode
      "@tscircuit/props": {},
    },
    circuit,
    ...webWorkerConfiguration,
  }
}
