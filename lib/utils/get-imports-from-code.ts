import { stripComments } from "./strip-comments"

export const getImportsFromCode = (code: string): string[] => {
  const strippedCode = stripComments(code)
  // Match basic import patterns including combined default and namespace imports
  // This regex handles both regular multi-line code and minified single-line code
  const importRegex =
    /^\s*import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s*)?['"](.+?)['"]/gm
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(strippedCode)) !== null) {
    const fullMatch = match[0]
    if (/^\s*import\s+type\b/.test(fullMatch)) {
      continue
    }
    imports.push(match[1])
  }

  // Handle minified code where imports are on a single line (e.g., from jsDelivr CDN)
  // This regex handles: import{x as y}from"path", import x from"path", import{x}from"path"
  // The (?:^|;) ensures we only match imports at start or after semicolon (not inside strings)
  const minifiedImportRegex =
    /(?:^|;)\s*import\s*(?:\{[^}]+\}|[\w$]+(?:\s*,\s*(?:\{[^}]+\}|\*\s+as\s+[\w$]+))?|\*\s+as\s+[\w$]+)\s*from\s*['"]([^'"]+)['"]/g

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = minifiedImportRegex.exec(strippedCode)) !== null) {
    const importPath = match[1]
    // Avoid duplicates from the first regex
    if (!imports.includes(importPath)) {
      imports.push(importPath)
    }
  }

  // Match re-exports
  const reExportRegex =
    /^\s*export\s+(?:type\s+)?(?:\*\s+as\s+[\w$]+|\*|\{[^}]+\})\s+from\s*['"](.+?)['"]/gm
  let reExportMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((reExportMatch = reExportRegex.exec(strippedCode)) !== null) {
    const fullMatch = reExportMatch[0]
    if (/^\s*export\s+type\b/.test(fullMatch)) {
      continue
    }
    imports.push(reExportMatch[1])
  }

  return imports
}
