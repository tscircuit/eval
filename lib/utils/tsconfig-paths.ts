import { dirname } from "./dirname"
import { normalizeFilePath } from "lib/runner/normalizeFsMap"

const TS_CONFIG_FILENAMES = ["tsconfig.json", "tsconfig.base.json"]

interface TsconfigPathEntry {
  pattern: string
  regex: RegExp
  targets: string[]
}

export interface TsconfigPathsConfig {
  absoluteBaseUrl: string
  entries: TsconfigPathEntry[]
}

function stripJsonComments(input: string): string {
  let output = ""
  let inString = false
  let stringQuote: string | null = null
  let inSingleLineComment = false
  let inMultiLineComment = false
  let previousChar = ""

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const nextChar = input[i + 1]

    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false
        output += char
      }
      continue
    }

    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false
        i += 1
      }
      continue
    }

    if (inString) {
      output += char
      if (char === stringQuote && previousChar !== "\\") {
        inString = false
        stringQuote = null
      }
      previousChar = char
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringQuote = char
      output += char
      previousChar = char
      continue
    }

    if (char === "/" && nextChar === "/") {
      inSingleLineComment = true
      i += 1
      continue
    }

    if (char === "/" && nextChar === "*") {
      inMultiLineComment = true
      i += 1
      continue
    }

    output += char
    previousChar = char
  }

  return output
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function joinPaths(...segments: string[]): string {
  const parts: string[] = []

  for (const segment of segments) {
    if (!segment) continue
    const normalizedSegment = segment.replace(/\\/g, "/")
    const tokens = normalizedSegment.split("/")

    for (const token of tokens) {
      if (!token || token === ".") continue
      if (token === "..") {
        if (parts.length > 0 && parts[parts.length - 1] !== "..") {
          parts.pop()
        } else {
          parts.push("..")
        }
      } else {
        parts.push(token)
      }
    }
  }

  return parts.join("/")
}

function applyStarMatches(target: string, matches: string[]): string {
  const segments = target.split("*")
  if (segments.length === 1) return target

  let result = ""
  for (let i = 0; i < segments.length; i++) {
    result += segments[i]
    if (i < matches.length) {
      result += matches[i]
    }
  }

  return result
}

function patternToRegex(pattern: string): RegExp {
  const escapedSegments = pattern.split("*").map(escapeRegExp)
  const regexPattern = `^${escapedSegments.join("(.+)")}$`
  return new RegExp(regexPattern)
}

export function createTsconfigPathsConfig(
  fsMap: Record<string, string>,
): TsconfigPathsConfig | null {
  let tsconfigPath: string | undefined

  for (const candidate of TS_CONFIG_FILENAMES) {
    if (candidate in fsMap) {
      tsconfigPath = candidate
      break
    }
  }

  if (!tsconfigPath) {
    tsconfigPath = Object.keys(fsMap).find((path) =>
      path.endsWith("tsconfig.json"),
    )
  }

  if (!tsconfigPath) return null

  const tsconfigContent = fsMap[tsconfigPath]
  if (!tsconfigContent) return null

  let parsed: any
  try {
    parsed = JSON.parse(stripJsonComments(tsconfigContent))
  } catch (error) {
    console.warn("Failed to parse tsconfig for path mappings", error)
    return null
  }

  const compilerOptions = parsed?.compilerOptions
  if (!compilerOptions) return null

  const paths = compilerOptions.paths as Record<string, string[] | undefined>
  if (!paths) return null

  const tsconfigDir = dirname(tsconfigPath)
  const normalizedTsconfigDir = tsconfigDir === "." ? "" : tsconfigDir

  const absoluteBaseUrl = joinPaths(
    normalizedTsconfigDir,
    compilerOptions.baseUrl ?? "",
  )

  const entries: TsconfigPathEntry[] = []

  for (const [pattern, targetList] of Object.entries(paths)) {
    if (!targetList || !Array.isArray(targetList) || targetList.length === 0)
      continue

    entries.push({
      pattern,
      regex: patternToRegex(pattern),
      targets: targetList.map((target) => normalizeFilePath(target)),
    })
  }

  if (entries.length === 0) return null

  return {
    absoluteBaseUrl,
    entries,
  }
}

export function resolveWithTsconfigPaths(
  importPath: string,
  config: TsconfigPathsConfig,
): string[] {
  const normalizedImportPath = normalizeFilePath(importPath)
  const resolvedPaths: string[] = []

  for (const entry of config.entries) {
    const match = normalizedImportPath.match(entry.regex)
    if (!match) continue

    const starMatches = match.slice(1)
    for (const target of entry.targets) {
      const substitutedTarget = applyStarMatches(target, starMatches)
      const candidatePath = joinPaths(config.absoluteBaseUrl, substitutedTarget)
      resolvedPaths.push(normalizeFilePath(candidatePath))
    }
  }

  return resolvedPaths
}
