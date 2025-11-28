import type { PackageJson } from "../resolve-node-module"
import { getModulePackageJson, hasTypeScriptEntrypoint } from "./helpers"

/**
 * SCENARIO 4: TypeScript entrypoint (unsupported)
 *
 * When a module's declared entrypoint (main/module field in package.json)
 * points to a TypeScript file (.ts or .tsx) instead of compiled JavaScript.
 * This is unsupported because the runtime cannot execute TypeScript directly.
 */
export function checkTypeScriptEntrypoint(
  packageName: string,
  fsMap: Record<string, string>,
): string | null {
  const modulePackageJson = getModulePackageJson(packageName, fsMap)

  if (hasTypeScriptEntrypoint(modulePackageJson)) {
    return `Node module '${packageName}' has a typescript entrypoint that is unsupported`
  }

  return null
}
