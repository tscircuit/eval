import type { PlatformConfig } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
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
        cadModel: { wrlUrl, modelUnitToMmScale: 2.54 },
      }
    },
  },
  footprintFileParserMap: {
    kicad_mod: {
      loadFromUrl: async (url: string) => {
        const kicadContent = await fetch(url).then((res) => res.text())
        const kicadJson = await parseKicadModToCircuitJson(kicadContent)
        return {
          footprintCircuitJson: Array.isArray(kicadJson)
            ? kicadJson
            : [kicadJson],
        }
      },
    },
  },
})
