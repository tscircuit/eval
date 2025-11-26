import { resolveFilePath } from "lib/runner/resolveFilePath"
import { STATIC_ASSET_EXTENSIONS } from "./static-assets-extension"

/**
 * Transforms static asset path variables in transpiled code to use resolved imports.
 *
 * Converts:
 *   var glbUrl = "./assets/file.glb"
 * To:
 *   var glbUrl = require("./assets/file.glb").default
 *
 * This allows the runtime to use the resolved URL instead of the raw string.
 *
 * @param code - The source code to transform
 * @param fsMap - The file system map for path resolution
 * @param cwd - Current working directory for relative path resolution
 * @returns Transformed code with static asset paths converted to require calls
 */
export const transformStaticAssetPaths = (
  code: string,
  fsMap: Record<string, string> | string[],
  cwd?: string,
): string => {
  const extensionsPattern = STATIC_ASSET_EXTENSIONS.join("|")

  // Match variable assignments with static asset paths
  const varAssignmentRegex = new RegExp(
    `((?:var|const|let)\\s+\\w+\\s*=\\s*)["'](\\.?\\.?\\/[^"']+\\.(${extensionsPattern}))["']`,
    "g",
  )

  let transformedCode = code.replace(
    varAssignmentRegex,
    (match, prefix, assetPath) => {
      // Check if this path can be resolved
      const resolvedPath = resolveFilePath(assetPath, fsMap, cwd)

      if (resolvedPath) {
        // Replace the string literal with a require call
        // This will use the resolved URL from preSuppliedImports
        return `${prefix}require("${assetPath}").default`
      }

      // If not resolved, leave as-is
      return match
    },
  )

  // Also transform object property assignments
  const propAssignmentRegex = new RegExp(
    `(\\w+\\s*:\\s*)["'](\\.?\\.?\\/[^"']+\\.(${extensionsPattern}))["']`,
    "g",
  )

  transformedCode = transformedCode.replace(
    propAssignmentRegex,
    (match, prefix, assetPath) => {
      const resolvedPath = resolveFilePath(assetPath, fsMap, cwd)

      if (resolvedPath) {
        return `${prefix}require("${assetPath}").default`
      }

      return match
    },
  )

  return transformedCode
}
