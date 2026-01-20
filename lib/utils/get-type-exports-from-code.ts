import { stripComments } from "./strip-comments"

export const getTypeExportsFromCode = (code: string): string[] => {
  const strippedCode = stripComments(code)
  const typeExports: string[] = []

  const exportTypeRegex = /export\s+type\s+(\w+)\s*(?:=|<)/g
  let match: RegExpExecArray | null
  while ((match = exportTypeRegex.exec(strippedCode)) !== null) {
    typeExports.push(match[1])
  }

  const exportInterfaceRegex = /export\s+interface\s+(\w+)/g
  while ((match = exportInterfaceRegex.exec(strippedCode)) !== null) {
    typeExports.push(match[1])
  }

  return typeExports
}
