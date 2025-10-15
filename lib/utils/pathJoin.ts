export function joinPath(...parts: string[]): string {
  const segments: string[] = []
  let isAbsolute = false

  for (const part of parts) {
    if (!part) continue
    const normalized = part.replace(/\\/g, "/")
    if (!normalized) continue

    if (normalized.startsWith("/")) {
      segments.length = 0
      isAbsolute = true
    }

    for (const segment of normalized.split("/")) {
      if (!segment || segment === ".") {
        continue
      }
      if (segment === "..") {
        if (segments.length && segments[segments.length - 1] !== "..") {
          segments.pop()
          continue
        }
        if (!isAbsolute) {
          segments.push("..")
        }
        continue
      }
      segments.push(segment)
    }
  }

  const joined = segments.join("/")
  if (isAbsolute) {
    return joined ? `/${joined}` : "/"
  }
  return joined
}
