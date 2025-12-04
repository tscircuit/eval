export const stripComments = (code: string): string => {
  let out = ""
  let i = 0

  let inSingle = false
  let inDouble = false
  let inTemplate = false

  while (i < code.length) {
    const ch = code[i]
    const next = code[i + 1]

    // Handle string/template literal states (so we don't treat comment markers inside strings as comments)
    if (!inDouble && !inTemplate && ch === "'" && code[i - 1] !== "\\") {
      inSingle = !inSingle
      out += ch
      i++
      continue
    }
    if (!inSingle && !inTemplate && ch === '"' && code[i - 1] !== "\\") {
      inDouble = !inDouble
      out += ch
      i++
      continue
    }
    if (!inSingle && !inDouble && ch === "`" && code[i - 1] !== "\\") {
      inTemplate = !inTemplate
      out += ch
      i++
      continue
    }

    // If we're not inside a string/template, remove comments
    if (!inSingle && !inDouble && !inTemplate) {
      // Line comment //
      if (ch === "/" && next === "/") {
        // Replace with spaces to keep column alignment; preserve newline
        out += "  "
        i += 2
        while (i < code.length && code[i] !== "\n") {
          out += " "
          i++
        }
        continue
      }

      // Block comment /* ... */
      if (ch === "/" && next === "*") {
        out += "  "
        i += 2
        while (i < code.length) {
          if (code[i] === "\n") out += "\n"
          else out += " "
          if (code[i] === "*" && code[i + 1] === "/") {
            out += " " // for '/'
            i += 2
            break
          }
          i++
        }
        continue
      }
    }

    out += ch
    i++
  }

  return out
}
