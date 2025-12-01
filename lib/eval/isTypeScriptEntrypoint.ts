/**
 * Check if the entrypoint is a TypeScript file
 */
export function isTypeScriptEntrypoint(entrypoint: string | null): boolean {
  if (!entrypoint) return false
  return entrypoint.endsWith(".ts") || entrypoint.endsWith(".tsx")
}
