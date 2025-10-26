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
      const code = await res.text()
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
