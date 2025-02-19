export const getImportsFromCode = (code: string): string[] => {
  const importRegex =
    /import\s+(?:(?:[\w\s]+,\s*)?(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s+)?['"](.+?)['"]/g
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }

  return imports
}
