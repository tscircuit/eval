import type { WebWorkerConfiguration } from "lib/shared/types"
import type { PlatformConfig, ProjectConfig } from "@tscircuit/props"
import { getPlatformConfig } from "./getPlatformConfig"

interface TscircuitConfigWithPlatformConfig extends ProjectConfig {
  platformConfig?: Partial<PlatformConfig>
  partsEngine?: PlatformConfig["partsEngine"]
}

export const getPlatformConfigForTscircuitConfig = (
  webWorkerConfiguration: WebWorkerConfiguration,
  config: TscircuitConfigWithPlatformConfig | null,
): PlatformConfig | undefined => {
  const pcbDisabled =
    config && "pcbDisabled" in config ? config.pcbDisabled : undefined
  const schematicDisabled =
    config && "schematicDisabled" in config
      ? config.schematicDisabled
      : undefined
  const configPlatform: Partial<PlatformConfig> = {
    ...(typeof pcbDisabled === "boolean" ? { pcbDisabled } : {}),
    ...(typeof schematicDisabled === "boolean" ? { schematicDisabled } : {}),
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
