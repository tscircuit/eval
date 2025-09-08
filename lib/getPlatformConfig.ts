import type { PlatformConfig } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"

const KICAD_FOOTPRINT_CACHE_URL = "https://kicad-mod-cache.tscircuit.com/"

export const getPlatformConfig = (): PlatformConfig => ({
  partsEngine: jlcPartsEngine,
  footprintLibraryMap: {
    kicad: async (footprintName: string) => {
      const url = `${KICAD_FOOTPRINT_CACHE_URL}/${footprintName}.circuit.json`
      const res = await fetch(url)
      return { footprintCircuitJson: await res.json() }
    },
  },
})
