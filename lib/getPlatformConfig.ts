import type { PlatformConfig } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"

const KICAD_FOOTPRINT_CACHE_URL = "https://kicad-mod-cache.tscircuit.com"

export const getPlatformConfig = (): PlatformConfig => ({
  partsEngine: jlcPartsEngine,
  footprintLibraryMap: {
    kicad: async (footprintName: string) => {
      const baseUrl = `${KICAD_FOOTPRINT_CACHE_URL}/${footprintName}`
      const circuitJsonUrl = `${baseUrl}.circuit.json`
      const res = await fetch(circuitJsonUrl)
      const raw = await res.json()
      // Filter pcb_silkscreen_text to only keep entries with text === "REF**"
      // Apply filtering only to elements coming from the kicad_mod_server response
      const filtered = Array.isArray(raw)
        ? raw.filter((el) =>
            el?.type === "pcb_silkscreen_text" ? el?.text === "REF**" : true,
          )
        : raw
      const wrlUrl = `${baseUrl}.wrl`
      return {
        footprintCircuitJson: filtered,
        cadComponent: { model_wrl_url: wrlUrl },
      }
    },
  },
})
