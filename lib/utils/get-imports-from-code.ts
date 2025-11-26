export const getImportsFromCode = (code: string): string[] => {
  const importsSet = new Set<string>()

  // Match ES6 import statements
  const importRegex =
    /^\s*import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s*)?['"](.+?)['"]/gm
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    const fullMatch = match[0]
    if (/^\s*import\s+type\b/.test(fullMatch)) {
      continue
    }
    importsSet.add(match[1])
  }

  // Match re-exports
  const reExportRegex =
    /^\s*export\s+(?:type\s+)?(?:\*\s+as\s+[\w$]+|\*|\{[^}]+\})\s+from\s*['"](.+?)['"]/gm
  let reExportMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((reExportMatch = reExportRegex.exec(code)) !== null) {
    const fullMatch = reExportMatch[0]
    if (/^\s*export\s+type\b/.test(fullMatch)) {
      continue
    }
    importsSet.add(reExportMatch[1])
  }

  // Handles: const x = require("..."), var x = require("..."), require("...")
  const requireRegex = /\brequire\s*\(\s*['"](.+?)['"]\s*\)/g
  let requireMatch: RegExpExecArray | null = requireRegex.exec(code)
  while (requireMatch !== null) {
    importsSet.add(requireMatch[1])
    requireMatch = requireRegex.exec(code)
  }

  return Array.from(importsSet)
}
