export const getImportsFromCode = (code: string): string[] => {
  // Match basic import patterns including namespace imports
  const importRegex =
    /^\s*import\s+(?:(?:\*\s+as\s+[\w\s]+|\{[\s\w,]+\}|\w+)\s+from\s+)?['"](.+?)['"]/gm
  const imports: string[] = []
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }

  return imports
}
