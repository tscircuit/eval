import type { PlatformConfig } from "@tscircuit/props"
import { createExecutionContext, importEvalPath } from "lib/eval"
import type { WebWorkerConfiguration } from "lib/shared/types"
import { getTsConfig } from "./tsconfigPaths"

const TSCIRCUIT_CONFIG_PATHS = [
  "tscircuit.config.ts",
  "tscircuit.config.js",
  "tscircuit.config.json",
]

type LoadedTscircuitConfig = Partial<PlatformConfig> & {
  platformConfig?: Partial<PlatformConfig>
  [key: string]: any
}

export const loadTscircuitConfig = async (
  fsMap: Record<string, string>,
  webWorkerConfiguration: WebWorkerConfiguration,
  opts: {
    debugNamespace?: string
  } = {},
): Promise<LoadedTscircuitConfig | null> => {
  const configPaths = TSCIRCUIT_CONFIG_PATHS.filter((path) => path in fsMap)
  if (configPaths.length === 0) return null

  let jsonConfig: LoadedTscircuitConfig | null = null
  const jsonConfigPath = configPaths.find((path) => path.endsWith(".json"))
  if (jsonConfigPath) {
    try {
      jsonConfig = JSON.parse(fsMap[jsonConfigPath])
    } catch (error) {
      console.warn("Failed to parse tscircuit.config.json:", error)
    }
  }

  const configPath = configPaths.find((path) => !path.endsWith(".json"))
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
