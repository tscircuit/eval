import * as Comlink from "comlink"

/**
 * Recursively replaces any function in the given object (including nested objects)
 * with a Comlink.proxy-wrapped version. Non-functions are left intact.
 *
 * @param obj - The object to proxyify.
 * @returns A shallow clone of `obj` with proxied functions.
 */
export function comlinkFunctionOnlyProxy<T extends object>(obj: T): T {
  if (typeof obj !== "object" || obj === null) return obj

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
    // return obj.map((v) => comlinkFunctionOnlyProxy(v)) as unknown as T
  }

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "function") {
      // Replace functions with Comlink proxies
      result[key] = Comlink.proxy(value)
    } else if (typeof value === "object" && value !== null) {
      // Recurse into nested objects
      result[key] = comlinkFunctionOnlyProxy(value)
    } else {
      result[key] = value
    }
  }

  return result
}
