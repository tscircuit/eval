import { type Transform as SucraseTransform, transform } from "sucrase"

const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"])
const JSX_EXTENSIONS = new Set([".tsx", ".jsx", ".ts"])
const TYPE_STAR_EXPORT_REGEX =
  /^\s*export\s+type\s+\*\s+(?:as\s+[\w$]+\s+)?from\s+['"][^'"]+['"]\s*;?\s*$/gim

const stripTypeStarExports = (code: string) =>
  code.replace(TYPE_STAR_EXPORT_REGEX, "")

/**
 * AI-generated TSX commonly wraps a block comment in braces between props.
 * JSX parsers reject that syntax because the braces are only valid after the
 * opening tag has closed. A plain block comment is valid in the same position.
 *
 * Each candidate is tried in isolation only after parsing fails. A candidate
 * is used only if that one repair makes the entire file parse, so valid JSX
 * child comments and comment-like text in strings remain unchanged.
 */
const getJsxCommentRepairCandidates = (code: string) => {
  const candidates: string[] = []
  const jsxCommentRegex = /\{\/\*[\s\S]*?\*\/\}/g

  for (const match of code.matchAll(jsxCommentRegex)) {
    const commentStart = match.index
    const commentEnd = commentStart + match[0].length
    const commentBody = match[0].slice(3, -3)
    candidates.push(
      `${code.slice(0, commentStart)}/* ${commentBody} */${code.slice(commentEnd)}`,
    )
  }

  return candidates
}

type SucraseSyntaxError = Error & {
  loc?: {
    line?: number
    column?: number
  }
}

const getSyntaxErrorMessage = (error: Error) =>
  error.message
    .replace(/^Error transforming [^:]+:\s*/, "")
    .replace(/\s*\(\d+:\d+\)$/, "")

const createCodeFrame = (code: string, line: number, column: number) => {
  const lines = code.split(/\r?\n/)
  const firstLine = Math.max(1, line - 2)
  const lastLine = Math.min(lines.length, line + 2)
  const lineNumberWidth = String(lastLine).length
  const frame: string[] = []

  for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
    const marker = lineNumber === line ? ">" : " "
    frame.push(
      `${marker} ${String(lineNumber).padStart(lineNumberWidth)} | ${lines[lineNumber - 1]}`,
    )
    if (lineNumber === line) {
      frame.push(
        `  ${" ".repeat(lineNumberWidth)} | ${" ".repeat(Math.max(0, column - 1))}^`,
      )
    }
  }

  return frame.join("\n")
}

const createHelpfulSyntaxError = (
  error: SucraseSyntaxError,
  code: string,
  filePath: string,
) => {
  const line = error.loc?.line
  const column = error.loc?.column

  if (typeof line !== "number" || typeof column !== "number") {
    return error
  }

  return new SyntaxError(
    `Syntax error in "${filePath}" at ${line}:${column}: ${getSyntaxErrorMessage(error)}\n\n${createCodeFrame(code, line, column)}`,
  )
}

const stripQueryAndHash = (filePath: string) => {
  const queryIndex = filePath.indexOf("?")
  const hashIndex = filePath.indexOf("#")

  let endIndex = filePath.length

  if (queryIndex !== -1 && hashIndex !== -1) {
    endIndex = Math.min(queryIndex, hashIndex)
  } else if (queryIndex !== -1) {
    endIndex = queryIndex
  } else if (hashIndex !== -1) {
    endIndex = hashIndex
  }

  return filePath.slice(0, endIndex)
}

const getExtension = (filePath: string) => {
  const normalizedPath = stripQueryAndHash(filePath)
  const lastDotIndex = normalizedPath.lastIndexOf(".")

  if (lastDotIndex === -1) {
    return ""
  }

  const lastSlashIndex = Math.max(
    normalizedPath.lastIndexOf("/"),
    normalizedPath.lastIndexOf("\\"),
  )

  if (lastSlashIndex > lastDotIndex) {
    return ""
  }

  return normalizedPath.slice(lastDotIndex).toLowerCase()
}

const getTransformsForFilePath = (filePath: string) => {
  const extension = getExtension(filePath)

  const transforms: SucraseTransform[] = ["imports"]

  if (TS_EXTENSIONS.has(extension)) {
    transforms.unshift("typescript")
  }

  if (JSX_EXTENSIONS.has(extension)) {
    transforms.push("jsx")
  }

  return transforms
}

export const transformWithSucrase = (code: string, filePath: string) => {
  const transforms = getTransformsForFilePath(filePath)
  const sanitizedCode = stripTypeStarExports(code)

  const transformCode = (codeToTransform: string) =>
    transform(codeToTransform, {
      filePath,
      disableESTransforms: true,
      production: true,
      transforms,
    }).code

  try {
    return transformCode(sanitizedCode)
  } catch (error) {
    if (!(error instanceof Error)) throw error

    for (const repairCandidate of getJsxCommentRepairCandidates(
      sanitizedCode,
    )) {
      try {
        return transformCode(repairCandidate)
      } catch {
        // This comment was not the parse error. Try the next candidate.
      }
    }

    throw createHelpfulSyntaxError(error, code, filePath)
  }
}
