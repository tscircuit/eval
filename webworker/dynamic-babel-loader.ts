/**
 * Dynamic loader for @babel/standalone to avoid bundling it with the webworker
 * This reduces the initial bundle size significantly
 */

let babelPromise: Promise<typeof import("@babel/standalone")> | null = null
let babelInstance: typeof import("@babel/standalone") | null = null

/**
 * Dynamically loads @babel/standalone from CDN
 * Uses caching to avoid multiple loads
 */
export async function loadBabel(): Promise<typeof import("@babel/standalone")> {
  if (babelInstance) {
    return babelInstance
  }

  if (babelPromise) {
    return await babelPromise
  }

  babelPromise = (async () => {
    try {
      // Try to load from unpkg CDN
      const response = await fetch('https://unpkg.com/@babel/standalone@7.28.0/babel.min.js')
      if (!response.ok) {
        throw new Error(`Failed to load Babel: ${response.status}`)
      }
      
      const babelCode = await response.text()
      
      // Create a blob URL and import it
      const blob = new Blob([babelCode], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      
      // Import the module
      const module = await import(url)
      
      // Clean up the blob URL
      URL.revokeObjectURL(url)
      
      // Babel standalone exports itself as window.Babel, so we need to get it from there
      const babel = (globalThis as any).Babel
      if (!babel) {
        throw new Error('Babel not found on global scope after loading')
      }
      
      babelInstance = babel
      return babel
    } catch (error) {
      // Fallback: try to import from node_modules if available
      try {
        const babel = await import('@babel/standalone')
        babelInstance = babel
        return babel
      } catch (fallbackError) {
        throw new Error(`Failed to load Babel dynamically: ${error}. Fallback also failed: ${fallbackError}`)
      }
    }
  })()

  return await babelPromise
}

/**
 * Transform code using dynamically loaded Babel
 */
export async function transformCode(
  code: string,
  options: {
    presets?: string[]
    plugins?: string[]
    filename?: string
  } = {}
) {
  const babel = await loadBabel()
  
  return babel.transform(code, {
    presets: options.presets || ["react", "typescript"],
    plugins: options.plugins || ["transform-modules-commonjs"],
    filename: options.filename || "virtual.tsx",
  })
}