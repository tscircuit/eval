import type { PlatformConfig, SpiceEngine } from "@tscircuit/props"
import { jlcPartsEngine } from "@tscircuit/parts-engine"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { dynamicallyLoadDependencyWithCdnBackup } from "./utils/dynamically-load-dependency-with-cdn-backup"

const KICAD_FOOTPRINT_CACHE_URL = "https://kicad-mod-cache.tscircuit.com"

let ngspiceEngineCache: SpiceEngine | null = null

const proxyFetch = ((url: any, options: any) => {
  const loc = (globalThis as any).location
  // Blob workers have origin "null"; extract the parent origin from href.
  const origin =
    loc?.origin && loc.origin !== "null"
      ? loc.origin
      : new URL(loc.href.slice(5)).origin
  const apiBase =
    (globalThis as any).TSCIRCUIT_FILESERVER_API_BASE_URL ?? `${origin}/api`
  return fetch(`${apiBase}/proxy`, {
    ...options,
    headers: {
      ...options?.headers,
      "X-Target-Url": url.toString(),
    },
  })
}) as typeof globalThis.fetch

export const getPlatformConfig = (
  overrides: Partial<PlatformConfig> = {},
): PlatformConfig => ({
  localCacheEngine: overrides.localCacheEngine,
  partsEngine: jlcPartsEngine,
  platformFetch: overrides.platformFetch ?? proxyFetch,
  spiceEngineMap: {
    ngspice: {
      simulate: async (spice: string) => {
        if (!ngspiceEngineCache) {
          const createNgspiceSpiceEngine =
            await dynamicallyLoadDependencyWithCdnBackup(
              "@tscircuit/ngspice-spice-engine",
            ).catch((error) => {
              throw new Error(
                "Could not load ngspice engine from local node_modules or CDN fallback.",
                { cause: error },
              )
            })

          if (createNgspiceSpiceEngine) {
            ngspiceEngineCache = await createNgspiceSpiceEngine()
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
      if (!res.ok) {
        const bodyPreview = (await res.text()).slice(0, 200)
        throw new Error(
          `Failed to load KiCad footprint \"${footprintName}\" from ${circuitJsonUrl} (HTTP ${res.status}). ${bodyPreview}`,
        )
      }

      let raw: any[] | Record<string, unknown>
      try {
        raw = await res.json()
      } catch {
        throw new Error(
          `Failed to parse KiCad footprint JSON for \"${footprintName}\" from ${circuitJsonUrl}`,
        )
      }
      // Filter pcb_silkscreen_text to only keep entries with text === "REF**"
      // Apply filtering only to elements coming from the kicad_mod_server response
      const filtered: any[] = Array.isArray(raw)
        ? raw.filter((el) =>
            el?.type === "pcb_silkscreen_text" ? el?.text === "REF**" : true,
          )
        : [raw]
      const wrlUrl = `${baseUrl}.wrl`
      const stepUrl = `${baseUrl}.step`
      return {
        footprintCircuitJson: filtered,
        cadModel: { wrlUrl, stepUrl, modelUnitToMmScale: 2.54 },
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
