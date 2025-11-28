import type { PackageJson } from "../resolve-node-module"
import {
  extractPackageName,
  getModulePackageJson,
  hasTypeScriptEntrypoint,
} from "./helpers"
import { checkNotDeclared } from "./checkNotDeclared"
import { checkNoFilesInNodeModules } from "./checkNoFilesInNodeModules"
import { checkMissingPackageJson } from "./checkMissingPackageJson"
import { checkTypeScriptEntrypoint } from "./checkTypeScriptEntrypoint"
import { checkMissingEntrypoint } from "./checkMissingEntrypoint"
import { checkMissingEntrypointField } from "./checkMissingEntrypointField"

export function getNodeModuleResolvedErrorMessage(
  importName: string,
  fsMap: Record<string, string>,
  resolvedPath: string,
): string | null {
  const packageName = extractPackageName(importName)
  const modulePackageJson = getModulePackageJson(packageName, fsMap)

  // Only flag TypeScript entrypoint if it's explicitly declared in package.json
  // If there's no package.json, the .ts file is acceptable (e.g., index.ts without package.json)
  if (
    modulePackageJson &&
    hasTypeScriptEntrypoint(modulePackageJson, resolvedPath)
  ) {
    return `Node module '${packageName}' has a typescript entrypoint that is unsupported`
  }
  return null
}

export function getNodeModuleUnresolvedErrorMessage(
  importName: string,
  fsMap: Record<string, string>,
): string | null {
  const packageName = extractPackageName(importName)

  // Parse root package.json safely (returns null if missing or invalid JSON)
  let rootPackageJson: PackageJson | null = null
  const rootPkgJsonString = fsMap["package.json"]
  if (rootPkgJsonString) {
    try {
      rootPackageJson = JSON.parse(rootPkgJsonString) as PackageJson
    } catch {
      // Invalid JSON - rootPackageJson stays null
    }
  }

  // If there's no package.json, skip all unresolved diagnostics
  // and let the import attempt to resolve from npm CDN
  if (!rootPackageJson) {
    return null
  }

  // Check each scenario in order of detection
  return (
    checkNotDeclared(packageName, rootPackageJson) ||
    checkNoFilesInNodeModules(packageName, fsMap) ||
    checkMissingPackageJson(packageName, fsMap) ||
    checkTypeScriptEntrypoint(packageName, fsMap) ||
    checkMissingEntrypoint(packageName, fsMap) ||
    checkMissingEntrypointField(packageName, fsMap) ||
    null
  )
}
