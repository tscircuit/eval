export function resolveRelativePath(relativePath: string, cwd: string): string {
    if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
      return relativePath
    }
  
    // Normalize paths to use forward slashes
    const normalizedCwd = cwd.replace(/\\/g, "/")
    const normalizedPath = relativePath.replace(/\\/g, "/")
    
    // Split into segments
    const cwdSegments = normalizedCwd.split("/").filter(Boolean)
    const pathSegments = normalizedPath.split("/").filter(Boolean)
    
    // Handle "./" prefix by removing it
    if (pathSegments[0] === ".") {
      pathSegments.shift()
    }
    
    const resultSegments = [...cwdSegments]
    
    // Process each segment
    for (const segment of pathSegments) {
      if (segment === "..") {
        // Go up one directory level
        if (resultSegments.length === 0) {
          throw new Error(`Cannot resolve path: ${relativePath} from ${cwd}. Path would go above root.`)
        }
        resultSegments.pop()
      } else {
        resultSegments.push(segment)
      }
    }
    
    return resultSegments.join("/")
  }