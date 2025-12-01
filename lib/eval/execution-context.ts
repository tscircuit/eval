import { RootCircuit } from "@tscircuit/core"
import type { WebWorkerConfiguration } from "lib/shared/types"
import * as tscircuitCore from "@tscircuit/core"
import * as React from "react"
import * as ReactJsxRuntime from "react/jsx-runtime"
import * as tscircuitMathUtils from "@tscircuit/math-utils"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "lib/getPlatformConfig"
import type { TsConfig } from "lib/runner/tsconfigPaths"
import Debug from "debug"

const debug = Debug("tsci:eval:execution-context")

interface StoredLogger {
  info: (message: string) => void
  getLogs: () => Array<{ msg: string }>
  stringifyLogs: () => string
}

export interface ExecutionContext extends WebWorkerConfiguration {
  fsMap: Record<string, string>
  entrypoint: string
  preSuppliedImports: Record<string, any>
  circuit: RootCircuit
  logger: StoredLogger
  tsConfig: TsConfig | null
  importStack: string[]
  currentlyImporting: Set<string>
}

export function createExecutionContext(
  webWorkerConfiguration: WebWorkerConfiguration,
  opts: {
    name?: string
    platform?: PlatformConfig
    projectConfig?: Partial<PlatformConfig>
    debugNamespace?: string
  } = {},
): ExecutionContext {
  globalThis.React = React

  const basePlatform = opts.platform || getPlatformConfig()
  const platform = opts.projectConfig
    ? { ...basePlatform, ...opts.projectConfig }
    : basePlatform

  if (platform.partsEngineDisabled) {
    platform.partsEngine = undefined
  }

  const circuit = new RootCircuit({
    platform,
  })

  if (opts.name) {
    circuit.name = opts.name
  }

  if (opts.debugNamespace) {
    circuit.enableDebug(opts.debugNamespace)
  }

  const logs: Array<{ msg: string }> = []

  return {
    fsMap: {},
    entrypoint: "",
    logger: {
      info: (message: string) => {
        logs.push({ msg: message })
      },
      getLogs: () => logs,
      stringifyLogs: () => logs.map((log) => log.msg).join("\n"),
    },
    preSuppliedImports: {
      "@tscircuit/core": tscircuitCore,
      tscircuit: tscircuitCore,
      "@tscircuit/math-utils": tscircuitMathUtils,
      react: React,
      "react/jsx-runtime": ReactJsxRuntime,
      debug: Debug,

      // This is usually used as a type import, we can remove the shim when we
      // ignore type imports in getImportsFromCode
      "@tscircuit/props": {},
    },
    circuit,
    tsConfig: null,
    importStack: [],
    currentlyImporting: new Set<string>(),
    ...webWorkerConfiguration,
  }
}
