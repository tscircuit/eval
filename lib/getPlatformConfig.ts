import type { PlatformConfig, SpiceEngine } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
const KICAD_FOOTPRINT_CACHE_URL = "https://kicad-mod-cache.tscircuit.com"

let ngspiceEngineCache: SpiceEngine | null = null

export const getPlatformConfig = (): PlatformConfig => ({
  partsEngine: jlcPartsEngine,
  spiceEngineMap: {
    ngspice: {
      simulate: async (spice: string) => {
        if (!ngspiceEngineCache) {
          try {
            const createNgspiceSpiceEngine = (
              await import("@tscircuit/ngspice-spice-engine")
            ).default
            ngspiceEngineCache = await createNgspiceSpiceEngine()
          } catch (e) {
            console.log(
              "Failed to load ngspice-spice-engine locally, trying CDN fallback...",
            )
            try {
              const res = await fetch(
                "https://cdn.jsdelivr.net/npm/@tscircuit/ngspice-spice-engine/+esm",
              )
              if (!res.ok) {
                throw new Error(
                  `Failed to fetch ngspice-spice-engine from CDN: ${res.statusText}`,
                )
              }
              const code = await res.text()
              const blob = new Blob([code], { type: "application/javascript" })
              const url = URL.createObjectURL(blob)
              const { default: createNgspiceSpiceEngine } = await import(url)
              URL.revokeObjectURL(url)
              ngspiceEngineCache = await createNgspiceSpiceEngine()
            } catch (cdnError) {
              console.error(
                "CDN fallback for ngspice-spice-engine also failed:",
                cdnError,
              )
            }
          }
        }

        if (!ngspiceEngineCache) {
          throw new Error(
            "Could not load ngspice engine from local node_modules or CDN fallback.",
          )
        }

        return ngspiceEngineCache.simulate(spice)
      },
    },
  },
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
