/**
 * Get all paths of an object
 *
 * getObjectPaths({ a: { b: 2, c: { d: 3 } }, e: 5 })
 *
 * // Output: ['a.b', 'a.c.d', 'e']
 */
export function getObjectPaths(
  obj: Record<string, any>,
  prefix = "",
): string[] {
  const paths: string[] = []

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue
    }

    const value = obj[key]
    const path = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const subPaths = getObjectPaths(value, path)
      paths.push(...subPaths)
    } else {
      paths.push(path)
    }
  }

  return paths
}

export function getValueAtPath(obj: Record<string, any>, path: string): any {
  const keys = path.split(".")
  let current = obj
  for (const key of keys) {
    current = current[key]
  }
  return current
}
/**
 * Set a value at a path in an object
 *
 * setValueAtPath({ a: { b: 2 } }, "a.c.d", 5)
 *
 * // Output: { a: { b: 2, c: { d: 5 } } }
 */
export function setValueAtPath(
  obj: Record<string, any>,
  path: string,
  value: any,
) {
  const keys = path.split(".")
  let current = obj
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]

    // If we're at the last key, set the value.
    if (i === keys.length - 1) {
      current[key] = value
    } else {
      // If the key doesn't exist or is not an object (avoid overwriting arrays), create a new object
      if (
        !Object.prototype.hasOwnProperty.call(current, key) ||
        typeof current[key] !== "object" ||
        current[key] === null ||
        Array.isArray(current[key])
      ) {
        current[key] = {}
      }
      current = current[key]
    }
  }
}
