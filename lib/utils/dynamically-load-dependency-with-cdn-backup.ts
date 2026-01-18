/**
 * Transforms relative /npm/ imports from jsdelivr CDN code to absolute URLs.
 */
export const transformJsDelivrImports = (code: string): string => {
  // Match both static imports: from "/npm/..." and dynamic imports: import("/npm/...")
  // Pattern handles both single and double quotes
  return code
    .replace(/from\s*["']\/npm\//g, 'from "https://cdn.jsdelivr.net/npm/')
    .replace(
      /import\s*\(\s*["']\/npm\//g,
      'import("https://cdn.jsdelivr.net/npm/',
    )
}

export const dynamicallyLoadDependencyWithCdnBackup = async (
  packageName: string,
): Promise<any> => {
  try {
    // First, try to import using Node.js resolution
    const module = await import(packageName)
    return module.default
  } catch (e) {
    console.log(`Failed to load ${packageName} locally, trying CDN fallback...`)
    // Fallback to JsDelivr CDN for browser environments
    try {
      const res = await fetch(
        `https://cdn.jsdelivr.net/npm/${packageName}/+esm`,
      )
      if (!res.ok) {
        throw new Error(
          `Failed to fetch ${packageName} from CDN: ${res.statusText}`,
        )
      }
      let code = await res.text()

      // Transform relative /npm/ imports to absolute jsdelivr URLs
      // This is needed because blob URLs resolve relative imports against the page origin
      code = transformJsDelivrImports(code)

      const blob = new Blob([code], { type: "application/javascript" })
      const url = URL.createObjectURL(blob)
      try {
        const { default: loadedModule } = await import(url)
        return loadedModule
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (cdnError) {
      console.error(`CDN fallback for ${packageName} also failed:`, cdnError)
      throw cdnError
    }
  }
}
