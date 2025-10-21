export const getImportsFromCode = (code: string): string[] => {
  // Match basic import patterns including combined default and namespace imports
  const importRegex =
    /^\s*import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s*)?['"](.+?)['"]/gm
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }

  // Match re-exports
  const reExportRegex =
    /^\s*export\s+(?:type\s+)?(?:\*\s+as\s+[\w$]+|\*|\{[^}]+\})\s+from\s*['"](.+?)['"]/gm
  let reExportMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((reExportMatch = reExportRegex.exec(code)) !== null) {
    imports.push(reExportMatch[1])
  }

  return imports
}
