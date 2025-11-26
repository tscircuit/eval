import { STATIC_ASSET_EXTENSIONS } from "./static-assets-extension"

/**
 * Extracts static asset paths from transpiled code that uses string variable assignments.
 *
 * This handles cases where build tools convert:
 *   import glbUrl from "./assets/file.glb"
 * Into:
 *   var glbUrl = "./assets/file.glb"
 *
 * @param code - The source code to scan
 * @returns Array of relative paths to static assets
 */
export const getStaticAssetPathsFromCode = (code: string): string[] => {
  const pathsSet = new Set<string>()

  // Match variable assignments with quoted strings ending in static asset extensions
  // Handles: var x = "...", const x = "...", let x = "..."
  const extensionsPattern = STATIC_ASSET_EXTENSIONS.join("|")
  const varAssignmentRegex = new RegExp(
    `(?:var|const|let)\\s+\\w+\\s*=\\s*["'](\\.?\\.?\\/[^"']+\\.(${extensionsPattern}))["']`,
    "g",
  )

  let match: RegExpExecArray | null = varAssignmentRegex.exec(code)
  while (match !== null) {
    pathsSet.add(match[1])
    match = varAssignmentRegex.exec(code)
  }

  // Also match object property assignments: glbPath: "./assets/file.glb"
  const propAssignmentRegex = new RegExp(
    `\\w+\\s*:\\s*["'](\\.?\\.?\\/[^"']+\\.(${extensionsPattern}))["']`,
    "g",
  )

  let match2: RegExpExecArray | null = propAssignmentRegex.exec(code)
  while (match2 !== null) {
    pathsSet.add(match2[1])
    match2 = propAssignmentRegex.exec(code)
  }

  return Array.from(pathsSet)
}
