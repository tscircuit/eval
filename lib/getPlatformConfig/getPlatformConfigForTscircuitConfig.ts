import type { WebWorkerConfiguration } from "lib/shared/types"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "./getPlatformConfig"

interface TscircuitConfigWithPlatformConfig {
  platformConfig?: Partial<PlatformConfig>
  partsEngine?: PlatformConfig["partsEngine"]
  pcbDisabled?: boolean
  schematicDisabled?: boolean
}

export const getPlatformConfigForTscircuitConfig = (
  webWorkerConfiguration: WebWorkerConfiguration,
  config: TscircuitConfigWithPlatformConfig | null,
): PlatformConfig | undefined => {
  const configPlatform: Partial<PlatformConfig> = {
    ...(typeof config?.pcbDisabled === "boolean"
      ? { pcbDisabled: config.pcbDisabled }
      : {}),
    ...(typeof config?.schematicDisabled === "boolean"
      ? { schematicDisabled: config.schematicDisabled }
      : {}),
    ...(config?.partsEngine ? { partsEngine: config.partsEngine } : {}),
    ...config?.platformConfig,
  }

  if (Object.keys(configPlatform).length === 0) return undefined

  const mergedConfigPlatform = {
    ...webWorkerConfiguration.projectConfig,
    ...configPlatform,
  }

  if (webWorkerConfiguration.platform) {
    const mergedPlatform = {
      ...webWorkerConfiguration.platform,
      ...mergedConfigPlatform,
    }

    if (mergedPlatform.partsEngineDisabled) {
      mergedPlatform.partsEngine = undefined
    }

    return mergedPlatform
  }

  const platform = {
    ...getPlatformConfig(mergedConfigPlatform, {
      easyEdaProxyConfig: webWorkerConfiguration.easyEdaProxyConfig,
    }),
    ...mergedConfigPlatform,
  }

  if (platform.partsEngineDisabled) {
    platform.partsEngine = undefined
  }

  return platform
}
