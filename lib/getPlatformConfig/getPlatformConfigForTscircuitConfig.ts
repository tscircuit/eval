import type { WebWorkerConfiguration } from "lib/shared/types"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "./getPlatformConfig"

interface TscircuitConfigWithPlatformConfig {
  platformConfig?: Partial<PlatformConfig>
  partsEngine?: PlatformConfig["partsEngine"]
}

export const getPlatformConfigForTscircuitConfig = (
  webWorkerConfiguration: WebWorkerConfiguration,
  config: TscircuitConfigWithPlatformConfig | null,
): PlatformConfig | undefined => {
  const configPlatform = config?.platformConfig
    ? config.platformConfig
    : config?.partsEngine
      ? { partsEngine: config.partsEngine }
      : undefined

  if (!configPlatform) return undefined

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
