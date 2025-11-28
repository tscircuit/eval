import type { PackageJson } from "../resolve-node-module"

export function extractPackageName(importName: string) {
  if (importName.startsWith("@")) {
    const [scope, name] = importName.split("/")
    return `${scope}/${name}`
  }
  return importName.split("/")[0]
}

export function isPackageDeclaredInRoot(
  packageName: string,
  rootPackageJson: PackageJson | null,
): boolean | null {
  if (!rootPackageJson) return null

  return (
    rootPackageJson.dependencies?.[packageName] !== undefined ||
    rootPackageJson.devDependencies?.[packageName] !== undefined ||
    rootPackageJson.peerDependencies?.[packageName] !== undefined ||
    rootPackageJson.optionalDependencies?.[packageName] !== undefined
  )
}

export function getModuleDirectoryFilePaths(
  packageName: string,
  fsMap: Record<string, string>,
): string[] {
  const modulePrefix = `node_modules/${packageName}/`
  return Object.keys(fsMap).filter((path) => path.startsWith(modulePrefix))
}

export function getModulePackageJson(
  packageName: string,
  fsMap: Record<string, string>,
): PackageJson | null {
  const pkgJsonPath = `node_modules/${packageName}/package.json`
  const jsonString = fsMap[pkgJsonPath]
  if (!jsonString) return null
  try {
    return JSON.parse(jsonString) as PackageJson
  } catch {
    return null
  }
}

export function getEntrypointPath(pkg: PackageJson | null): string | null {
  if (!pkg) return null
  // Check in order of precedence: module (ESM), main (CommonJS)
  return pkg.module || pkg.main || null
}

export function doesEntrypointExist(
  params: { packageName: string; entrypoint: string },
  fsMap: Record<string, string>,
): boolean {
  const fullPath = `node_modules/${params.packageName}/${params.entrypoint}`
  return fullPath in fsMap
}

export function hasTypeScriptEntrypoint(
  pkg: PackageJson | null,
  resolvedPath?: string | null,
) {
  if (resolvedPath && /\.tsx?$/.test(resolvedPath)) return true
  const entrypoint = getEntrypointPath(pkg)
  return Boolean(entrypoint && /\.tsx?$/.test(entrypoint))
}
