import type { AnyCircuitElement } from "circuit-json"
import type { RootCircuitEventName as CoreRootCircuitEventName } from "@tscircuit/core"
import type { PlatformConfig } from "@tscircuit/props"
import type { FilesystemHandler } from "lib/filesystem/types"

export type RootCircuitEventName = CoreRootCircuitEventName | "debug:logOutput"

export interface CircuitRunnerConfiguration {
  snippetsApiBaseUrl: string
  cjsRegistryUrl: string
  verbose?: boolean
  platform?: PlatformConfig
  projectConfig?: Partial<PlatformConfig>
}

export interface WebWorkerConfiguration extends CircuitRunnerConfiguration {
  evalVersion?: string
  /**
   * @deprecated, renamed to webWorkerBlobUrl
   */
  webWorkerUrl?: URL | string
  webWorkerBlobUrl?: URL | string
  /**
   * Enable fetch proxy to route worker fetch requests through parent thread.
   * Useful when running in restricted environments (like ChatGPT) where
   * worker fetch requests are blocked.
   * Default: false
   */
  enableFetchProxy?: boolean
  /**
   * Disable npm package resolution from jsDelivr CDN.
   * When true, import statements for npm packages will throw an error instead
   * of being resolved from the CDN.
   * Default: false
   */
  disableCdnLoading?: boolean
}

/**
 * API for the CircuitRunner class, used for eval'ing circuits
 */
export interface CircuitRunnerApi {
  version: () => Promise<string>
  execute: (
    code: string,
    opts?: {
      name?: string
    },
  ) => Promise<void>
  executeComponent: (component: any) => Promise<void>
  executeWithFsMap(opts: {
    entrypoint?: string
    mainComponentPath?: string
    mainComponentName?: string
    mainComponentProps?: Record<string, any>
    fs?: FilesystemHandler | MessagePort
    fsMap?: Record<string, string>
    name?: string
  }): Promise<void>
  renderUntilSettled: () => Promise<void>
  getCircuitJson: () => Promise<AnyCircuitElement[]>
  setSnippetsApiBaseUrl: (baseUrl: string) => Promise<void>
  setDisableCdnLoading: (disable: boolean) => Promise<void>
  setPlatformConfig: (platform: PlatformConfig) => Promise<void>
  setProjectConfig: (project: Partial<PlatformConfig>) => Promise<void>
  setPlatformConfigProperty: (property: string, value: any) => Promise<void>
  setProjectConfigProperty: (property: string, value: any) => Promise<void>
  enableDebug: (namespace: string) => Promise<void>
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
  executeComponent: (component: any) => Promise<void>
  executeWithFsMap: (opts: {
    entrypoint?: string
    mainComponentPath?: string
    fs?: FilesystemHandler | MessagePort
    fsMap?: Record<string, string>
    mainComponentName?: string
    mainComponentProps?: Record<string, any>
  }) => Promise<void>
  renderUntilSettled: () => Promise<void>
  getCircuitJson: () => Promise<AnyCircuitElement[]>
  on: (event: RootCircuitEventName, callback: (...args: any[]) => void) => void
  clearEventListeners: () => Promise<void>
  enableDebug: (namespace: string) => Promise<void>
  version: () => Promise<string>
  kill: () => Promise<void>
}
