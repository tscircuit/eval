import type { PlatformConfig } from "@tscircuit/props"
import { createExecutionContext, importEvalPath } from "lib/eval"
import type { WebWorkerConfiguration } from "lib/shared/types"
import { getTsConfig } from "./tsconfigPaths"

const TSCIRCUIT_CONFIG_PATHS = ["tscircuit.config.ts", "tscircuit.config.js"]
const TSCIRCUIT_JSON_CONFIG_PATH = "tscircuit.config.json"

interface LoadedTscircuitConfig {
  platformConfig?: Partial<PlatformConfig>
  partsEngine?: PlatformConfig["partsEngine"]
  [key: string]: any
}

export const loadTscircuitConfig = async (
  fsMap: Record<string, string>,
  webWorkerConfiguration: WebWorkerConfiguration,
  opts: {
    debugNamespace?: string
  } = {},
): Promise<LoadedTscircuitConfig | null> => {
  let jsonConfig: LoadedTscircuitConfig | null = null
  if (TSCIRCUIT_JSON_CONFIG_PATH in fsMap) {
    try {
      jsonConfig = JSON.parse(fsMap[TSCIRCUIT_JSON_CONFIG_PATH])
    } catch (error) {
      console.warn("Failed to parse tscircuit.config.json:", error)
    }
  }

  const configPath = TSCIRCUIT_CONFIG_PATHS.find((path) => path in fsMap)
  if (!configPath) return jsonConfig

  const ctx = createExecutionContext(webWorkerConfiguration, {
    platform: webWorkerConfiguration.platform,
    projectConfig: webWorkerConfiguration.projectConfig,
    debugNamespace: opts.debugNamespace,
  })
  ctx.entrypoint = configPath
  ctx.fsMap = fsMap
  ctx.tsConfig = getTsConfig(fsMap)
  ;(globalThis as any).__tscircuit_circuit = ctx.circuit

  await importEvalPath(`./${configPath}`, ctx)

  const moduleExports = ctx.preSuppliedImports[configPath]
  const moduleConfig = moduleExports?.default ?? moduleExports ?? null

  return {
    ...(jsonConfig ?? {}),
    ...(moduleConfig ?? {}),
  }
}
