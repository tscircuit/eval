import type { AnyCircuitElement } from "circuit-json"
import type { RootCircuitEventName } from "@tscircuit/core"
import type { PlatformConfig } from "@tscircuit/props"

export interface CircuitRunnerConfiguration {
  snippetsApiBaseUrl: string
  cjsRegistryUrl: string
  verbose?: boolean
  platform?: PlatformConfig
}

export interface WebWorkerConfiguration extends CircuitRunnerConfiguration {
  evalVersion?: string
  /**
   * @deprecated, renamed to webWorkerBlobUrl
   */
  webWorkerUrl?: URL | string
  webWorkerBlobUrl?: URL | string
}

/**
 * API for the CircuitRunner class, used for eval'ing circuits
 */
export interface CircuitRunnerApi {
  execute: (
    code: string,
    opts?: {
      name?: string
    },
  ) => Promise<void>
  executeWithFsMap(opts: {
    entrypoint?: string
    fsMap: Record<string, string>
    name?: string
  }): Promise<void>
  renderUntilSettled: () => Promise<void>
  getCircuitJson: () => Promise<AnyCircuitElement[]>
  setSnippetsApiBaseUrl: (baseUrl: string) => Promise<void>
  setPlatformConfig: (platform: PlatformConfig) => Promise<void>
  on: (event: RootCircuitEventName, callback: (...args: any[]) => void) => void
  clearEventListeners: () => void
  kill: () => Promise<void>
}

/**
 * @deprecated, use CircuitRunnerApi instead
 */
export type InternalWebWorkerApi = CircuitRunnerApi

export type CircuitWebWorker = {
  execute: (code: string) => Promise<void>
  executeWithFsMap: (opts: {
    entrypoint?: string
    mainComponentPath?: string
    fsMap: Record<string, string>
  }) => Promise<void>
  renderUntilSettled: () => Promise<void>
  getCircuitJson: () => Promise<AnyCircuitElement[]>
  on: (event: RootCircuitEventName, callback: (...args: any[]) => void) => void
  clearEventListeners: () => void
  kill: () => Promise<void>
}
