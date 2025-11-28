import type { PackageJson } from "../resolve-node-module"
import { isPackageDeclaredInRoot } from "./helpers"

/**
 * SCENARIO 1: Module not declared in package.json
 *
 * When a module is imported but not listed in any dependency field
 * (dependencies, devDependencies, peerDependencies, optionalDependencies)
 * in the root package.json
 */
export function checkNotDeclared(
  packageName: string,
  rootPackageJson: PackageJson | null,
): string | null {
  const isPackageDeclared = isPackageDeclaredInRoot(
    packageName,
    rootPackageJson,
  )

  // Handle both false (not declared) and null (package.json missing/unparseable)
  // Both cases mean the module is not properly declared as a dependency
  if (isPackageDeclared === false || isPackageDeclared === null) {
    return `Node module imported but not in package.json '${packageName}'`
  }

  return null
}
