import type { PlatformConfig } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"

export const getPlatformConfig = (): PlatformConfig => ({
  partsEngine: jlcPartsEngine,
})
