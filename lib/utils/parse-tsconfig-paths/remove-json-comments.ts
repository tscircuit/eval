/**
 * Remove single-line and multi-line comments from JSON string
 */
export function removeJsonComments(jsonString: string): string {
  // Remove single-line comments (// ...)
  let result = jsonString.replace(/\/\/.*$/gm, "")

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, "")

  return result
}
