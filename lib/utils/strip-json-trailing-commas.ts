export const stripJsonTrailingCommas = (jsonc: string): string => {
  let out = ""
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonc.length; i++) {
    const ch = jsonc[i]

    if (inString) {
      out += ch
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      out += ch
      continue
    }

    if (ch === ",") {
      let nextIndex = i + 1
      while (/\s/.test(jsonc[nextIndex] ?? "")) {
        nextIndex++
      }
      const nextNonWhitespace = jsonc[nextIndex]
      if (nextNonWhitespace === "}" || nextNonWhitespace === "]") {
        continue
      }
    }

    out += ch
  }

  return out
}
