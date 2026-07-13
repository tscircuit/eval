import { extractBasePackageName } from "./extractBasePackageName"
import { getImportingPackageName } from "./getImportingPackageName"

type MissingNodeModuleReason = "not-declared" | "no-files"

/**
 * Build a descriptive error message for a node module that could not be
 * resolved from the supplied fsMap.
 *
 * When the import originates from inside another package's files (i.e. it is a
 * transitive dependency), the message names the importing package and makes
 * clear that the missing dependency must itself be supplied in the fsMap
 * node_modules directory. This is the recurring failure class where a package
 * loads fine but one of its own transitive dependencies is absent from the
 * sandbox (e.g. "nth-check" via "css-select", "iobuffer" via
 * "@tscircuit/image-utils").
 */
export function getMissingNodeModuleErrorMessage(
  importName: string,
  reason: MissingNodeModuleReason,
  opts: { cwd?: string } = {},
): string {
  const base =
    reason === "not-declared"
      ? `Node module imported but not in package.json "${importName}"`
      : `Node module "${importName}" has no files in the node_modules directory`

  const importingPackage = getImportingPackageName(opts.cwd)
  if (!importingPackage) return base

  const basePackageName = extractBasePackageName(importName)

  return (
    `${base}\n\n` +
    `"${importName}" is a transitive dependency of "${importingPackage}"` +
    `${opts.cwd ? ` (imported from "${opts.cwd}")` : ""}. ` +
    `Its files are missing from the sandbox — supply "${importingPackage}"'s ` +
    `dependency "${basePackageName}" in the fsMap under ` +
    `"node_modules/${basePackageName}", or make it available via the platform ` +
    `nodeModulesResolver / CDN.`
  )
}
