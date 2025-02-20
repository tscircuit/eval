export const getImportsFromCode = (code: string): string[] => {
  // Match only at start of line (allowing whitespace)
  const importRegex =
    /^\s*import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s+)?['"](.+?)['"]/gm
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }

  return imports
}
