export const getImportsFromCode = (code: string): string[] => {
  // Match basic import patterns including combined default and namespace imports
  const importRegex =
    /^\s*import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s*)?['"](.+?)['"]/gm
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    const fullMatch = match[0]
    if (/^\s*import\s+type\b/.test(fullMatch)) {
      continue
    }
    imports.push(match[1])
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
    imports.push(reExportMatch[1])
  }

  return imports
}
