import type { PlatformConfig } from "@tscircuit/props"

export const mergePlatformConfig = (
  basePlatform: PlatformConfig,
  overridePlatform: Partial<PlatformConfig>,
): PlatformConfig => ({
  ...basePlatform,
  ...overridePlatform,
  footprintLibraryMap: {
    ...basePlatform.footprintLibraryMap,
    ...overridePlatform.footprintLibraryMap,
  },
})
