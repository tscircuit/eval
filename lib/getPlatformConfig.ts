import {
  cadModelProp,
  type CadModelProp,
  type PlatformConfig,
  type SpiceEngine,
} from "@tscircuit/props"
import {
  JlcPcbPartsEngine,
  jlcPartsEngine,
  type EasyEdaProxyConfig,
} from "@tscircuit/parts-engine"
import { createKiCadRoutingToolsAutorouter } from "@tscircuit/krt-wasm"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { dynamicallyLoadDependencyWithCdnBackup } from "./utils/dynamically-load-dependency-with-cdn-backup"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import * as React from "react"

const KICAD_FOOTPRINT_CACHE_URL = "https://kicad-mod-cache.tscircuit.com"

let ngspiceEngineCache: SpiceEngine | null = null

type PlatformAutorouterMap = NonNullable<PlatformConfig["autorouterMap"]>
type PlatformCreateAutorouter =
  PlatformAutorouterMap[string]["createAutorouter"]
type PlatformStaticFileLoaderMap = NonNullable<
  PlatformConfig["staticFileLoaderMap"]
>

const toJlcpcbSupplierPartNumber = (partNumber: string) => {
  if (/^\d+$/.test(partNumber)) {
    return `C${partNumber}`
  }

  if (/^c\d+$/i.test(partNumber)) {
    return `C${partNumber.slice(1)}`
  }

  return partNumber
}

const extractCadModelFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
): CadModelProp | undefined => {
  const cadComponent = circuitJson.find(
    (elm): elm is CadComponent => elm.type === "cad_component",
  )
  if (!cadComponent) return undefined

  const cadModelCandidate: Record<string, unknown> = {
    stlUrl: cadComponent.model_stl_url,
    objUrl: cadComponent.model_obj_url,
    gltfUrl: cadComponent.model_gltf_url,
    glbUrl: cadComponent.model_glb_url,
    stepUrl: cadComponent.model_step_url,
    wrlUrl: cadComponent.model_wrl_url,
    modelOriginPosition: cadComponent.model_origin_position ?? undefined,
    modelUnitToMmScale: cadComponent.model_unit_to_mm_scale_factor,
    modelBoardNormalDirection: cadComponent.model_board_normal_direction,
    size: cadComponent.size ?? undefined,
    rotationOffset: cadComponent.rotation ?? undefined,
    positionOffset: cadComponent.position ?? undefined,
    showAsTranslucentModel: cadComponent.show_as_translucent_model,
  }

  if (
    !cadModelCandidate.stlUrl &&
    !cadModelCandidate.objUrl &&
    !cadModelCandidate.gltfUrl &&
    !cadModelCandidate.glbUrl &&
    !cadModelCandidate.stepUrl &&
    !cadModelCandidate.wrlUrl &&
    !cadComponent.model_jscad
  ) {
    return undefined
  }

  if (
    cadComponent.model_jscad &&
    typeof cadComponent.model_jscad === "object"
  ) {
    cadModelCandidate.jscad = cadComponent.model_jscad
  }

  const parsedCadModel = cadModelProp.safeParse(cadModelCandidate)
  return parsedCadModel.success ? parsedCadModel.data : undefined
}

const loadKicadPcbStaticFile: PlatformStaticFileLoaderMap[string] = async (
  fileContent,
) => {
  const kicadPcbContent =
    typeof fileContent === "string"
      ? fileContent
      : new TextDecoder().decode(fileContent)

  if (
    kicadPcbContent === "__STATIC_ASSET__" ||
    kicadPcbContent.startsWith("blob:")
  ) {
    throw new Error(
      ".kicad_pcb imports require local file contents. Static asset URLs are not supported.",
    )
  }

  const converter = new KicadToCircuitJsonConverter()
  converter.addFile("imported.kicad_pcb", kicadPcbContent)
  converter.runUntilFinished()
  const circuitJson = converter.getOutput()
  // TODO: Figure out what should be present in boardContentCircuitJson
  const boardContentCircuitJson = circuitJson.filter(
    (elm: AnyCircuitElement) => elm.type !== "pcb_board",
  )
  const Board = (props: Record<string, any>) =>
    React.createElement("board", {
      ...props,
      circuitJson,
    })

  return {
    __esModule: true,
    default: circuitJson,
    Board,
    boardContentCircuitJson,
    circuitJson,
  }
}

export const getPlatformConfig = (
  overrides: Partial<PlatformConfig> = {},
  options: {
    easyEdaProxyConfig?: EasyEdaProxyConfig
  } = {},
): PlatformConfig => {
  let partsEngine = overrides.partsEngine ?? jlcPartsEngine

  if (!overrides.partsEngine && options.easyEdaProxyConfig) {
    partsEngine = new JlcPcbPartsEngine({
      platformFetch: overrides.platformFetch,
      easyEdaProxyConfig: options.easyEdaProxyConfig,
    })
  }

  return {
    localCacheEngine: overrides.localCacheEngine,
    partsEngine,
    autorouterMap: {
      krt: {
        // TODO: Remove this cast once @tscircuit/props models the evented
        // GenericLocalAutorouter shape that core consumes from autorouterMap.
        createAutorouter: createKiCadRoutingToolsAutorouter({
          gridStep: 0.1,
          clearance: 0.2,
          maxIterations: 300_000,
        }) as unknown as PlatformCreateAutorouter,
      },
      ...overrides.autorouterMap,
    },
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
      jlcpcb: async (partNumber: string) => {
        if (!partsEngine.fetchPartCircuitJson) {
          throw new Error(
            "Configured parts engine does not support fetchPartCircuitJson, required for jlcpcb footprints.",
          )
        }

        const supplierPartNumber = toJlcpcbSupplierPartNumber(partNumber)
        const footprintCircuitJson = await partsEngine.fetchPartCircuitJson({
          supplierPartNumber,
          platformFetch: overrides.platformFetch,
        })

        if (!Array.isArray(footprintCircuitJson)) {
          throw new Error(
            `Failed to load JLCPCB footprint "${supplierPartNumber}" from parts engine.`,
          )
        }

        return {
          footprintCircuitJson,
          cadModel: extractCadModelFromCircuitJson(footprintCircuitJson),
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
    staticFileLoaderMap: {
      kicad_pcb: loadKicadPcbStaticFile,
      ...overrides.staticFileLoaderMap,
    },
  }
}
