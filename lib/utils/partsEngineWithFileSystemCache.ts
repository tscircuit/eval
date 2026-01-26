import type { PartsEngine, SupplierPartNumbers } from "@tscircuit/props"
import Debug from "debug"

/**
 * Interface for a filesystem cache engine that can persist cache to disk.
 * When running locally via CLI, this can be implemented to save to .tscircuit/
 */
export interface FilesystemCacheEngine {
  get: (key: string) => Promise<string | null> | string | null
  set: (key: string, value: string) => Promise<void> | void
}

export interface PartsEngineCacheKey {
  type: string
  ftype: string
  resistance?: number
  capacitance?: number
  inductance?: number
  frequency?: number
  load_capacitance?: number
  voltage?: number
  max_resistance?: number
  pin_count?: number
  gender?: string
  transistor_type?: string
  mosfet_mode?: string
  channel_type?: string
}

const debug = Debug("tscircuit-eval:utils:partsEngineWithFileSystemCache")

/**
 * Creates a cache key from the findPart parameters
 */
function createPartsEngineCacheKey(params: {
  sourceComponent: any
  footprinterString?: string
}): PartsEngineCacheKey {
  const { sourceComponent, footprinterString } = params
  const keyObj = {
    type: sourceComponent.type,
    ftype: sourceComponent.ftype,
    // Include relevant component properties based on ftype
    ...(sourceComponent.resistance && {
      resistance: sourceComponent.resistance,
    }),
    ...(sourceComponent.capacitance && {
      capacitance: sourceComponent.capacitance,
    }),
    ...(sourceComponent.inductance && {
      inductance: sourceComponent.inductance,
    }),
    ...(sourceComponent.frequency && { frequency: sourceComponent.frequency }),
    ...(sourceComponent.load_capacitance && {
      load_capacitance: sourceComponent.load_capacitance,
    }),
    ...(sourceComponent.voltage && { voltage: sourceComponent.voltage }),
    ...(sourceComponent.max_resistance && {
      max_resistance: sourceComponent.max_resistance,
    }),
    ...(sourceComponent.pin_count && { pin_count: sourceComponent.pin_count }),
    ...(sourceComponent.gender && { gender: sourceComponent.gender }),
    ...(sourceComponent.transistor_type && {
      transistor_type: sourceComponent.transistor_type,
    }),
    ...(sourceComponent.mosfet_mode && {
      mosfet_mode: sourceComponent.mosfet_mode,
    }),
    ...(sourceComponent.channel_type && {
      channel_type: sourceComponent.channel_type,
    }),
    ...(footprinterString && { footprinterString }),
  }
  return keyObj
}

/**
 * Wraps a PartsEngine with filesystem caching support.
 * When a cache engine is provided, it will:
 * 1. Check the cache first before calling findPart
 * 2. Store results in the cache after fetching
 *
 * @param baseEngine - The underlying parts engine to wrap
 * @param cacheEngine - Optional filesystem cache engine for persistence
 * @returns A wrapped PartsEngine with caching support
 */
export function partsEngineWithFilesystemCache(
  baseEngine: PartsEngine,
  cacheEngine?: FilesystemCacheEngine,
): PartsEngine {
  if (!cacheEngine) {
    return baseEngine
  }

  return {
    findPart: async (params): Promise<SupplierPartNumbers> => {
      const cacheKey = createPartsEngineCacheKey(params)

      // Try to get from cache first
      try {
        const cached = await cacheEngine.get(JSON.stringify(cacheKey))
        if (cached) {
          return JSON.parse(cached)
        }
      } catch {
        // Cache read or parse failed, proceed to fetch from parts engine
      }

      // Call the underlying parts engine
      const result = await baseEngine.findPart(params)
      debug("found part", { cacheKey, result })

      // Store in cache
      try {
        await cacheEngine.set(JSON.stringify(cacheKey), JSON.stringify(result))
      } catch {
        // Cache write failed, continue anyway
      }

      return result
    },
  }
}
