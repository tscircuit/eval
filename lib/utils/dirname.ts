/**
 * Returns the directory name of a path, similar to Node.js path.dirname
 * Works on both Unix and Windows paths
 * @param path The path to extract the directory from
 * @returns The directory part of the path
 */
export function dirname(path: string): string {
  if (!path) return "."

  // Normalize path separators to forward slashes
  const normalizedPath = path.replace(/\\/g, "/")

  // Remove trailing slashes
  const cleanPath = normalizedPath.replace(/\/+$/, "")

  // If there are no slashes, return "."
  if (cleanPath.indexOf("/") === -1) return "."

  // Return everything up to the last slash
  return cleanPath.substring(0, cleanPath.lastIndexOf("/")) || "/"
}
