import type { PackageJson as NodePackageJson } from "./resolve-node-module"

interface RootPackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

interface NodeModuleInfo {
  packageName: string
  declaredInRoot: boolean | null
  moduleFiles: string[]
  modulePackageJson: NodePackageJson | null
}

type ExportValue = string | Record<string, string | Record<string, string>>

type PackageJsonWithDistHints = NodePackageJson & {
  exports?: Record<string, ExportValue> | ExportValue
}

function parseJson<T>(json?: string | null): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function extractPackageName(importName: string) {
  if (importName.startsWith("@")) {
    const [scope, name] = importName.split("/")
    return `${scope}/${name}`
  }
  return importName.split("/")[0]
}

function isDeclaredInRootPackageJson(
  packageName: string,
  rootPackageJson: RootPackageJson | null,
): boolean | null {
  if (!rootPackageJson) return null

  const combinedDeps = {
    ...(rootPackageJson.dependencies || {}),
    ...(rootPackageJson.devDependencies || {}),
    ...(rootPackageJson.peerDependencies || {}),
    ...(rootPackageJson.optionalDependencies || {}),
  }

  return Object.prototype.hasOwnProperty.call(combinedDeps, packageName)
}

function getModuleFiles(fsMap: Record<string, string>, packageName: string) {
  const prefix = `node_modules/${packageName}/`
  return Object.keys(fsMap).filter((path) => path.startsWith(prefix))
}

function getModulePackageJson(
  fsMap: Record<string, string>,
  packageName: string,
): NodePackageJson | null {
  const pkgJsonPath = `node_modules/${packageName}/package.json`
  return parseJson<NodePackageJson>(fsMap[pkgJsonPath])
}

function getPackageEntrypoint(pkg: NodePackageJson | null) {
  if (!pkg) return null
  return pkg.module || pkg.main || null
}

function exportsMentionDist(exportsField: PackageJsonWithDistHints["exports"]) {
  if (!exportsField) return false
  if (typeof exportsField === "string") return exportsField.includes("dist/")
  return JSON.stringify(exportsField).includes("dist/")
}

function mentionsDist(pkg: PackageJsonWithDistHints) {
  const entrypoint = getPackageEntrypoint(pkg)
  return Boolean(
    (entrypoint && entrypoint.includes("dist/")) ||
      exportsMentionDist(pkg.exports),
  )
}

function getEntrypointPath(pkg: NodePackageJson | null): string | null {
  if (!pkg) return null
  // Check in order of precedence: module (ESM), main (CommonJS)
  return pkg.module || pkg.main || null
}

function doesEntrypointExist(
  fsMap: Record<string, string>,
  packageName: string,
  entrypoint: string,
): boolean {
  const fullPath = `node_modules/${packageName}/${entrypoint}`
  return Object.prototype.hasOwnProperty.call(fsMap, fullPath)
}

function findExistingEntrypoint(
  fsMap: Record<string, string>,
  packageName: string,
  pkg: NodePackageJson | null,
): string | null {
  if (!pkg) return null

  // Try declared entrypoints in order of precedence
  const candidates = [pkg.module, pkg.main, "index.js", "dist/index.js"].filter(
    Boolean,
  )

  for (const candidate of candidates) {
    if (doesEntrypointExist(fsMap, packageName, candidate!)) {
      return candidate!
    }
  }

  return null
}

function hasTypeScriptEntrypoint(
  pkg: NodePackageJson | null,
  resolvedPath?: string | null,
) {
  if (resolvedPath && /\.tsx?$/.test(resolvedPath)) return true
  const entrypoint = getPackageEntrypoint(pkg)
  return Boolean(entrypoint && /\.tsx?$/.test(entrypoint))
}

function getNodeModuleInfo(
  importName: string,
  fsMap: Record<string, string>,
): NodeModuleInfo {
  const packageName = extractPackageName(importName)
  const rootPackageJson = parseJson<RootPackageJson>(fsMap["package.json"])

  return {
    packageName,
    declaredInRoot: isDeclaredInRootPackageJson(packageName, rootPackageJson),
    moduleFiles: getModuleFiles(fsMap, packageName),
    modulePackageJson: getModulePackageJson(fsMap, packageName),
  }
}

export function getNodeModuleResolvedError(
  importName: string,
  fsMap: Record<string, string>,
  resolvedPath: string,
): string | null {
  const info = getNodeModuleInfo(importName, fsMap)
  if (hasTypeScriptEntrypoint(info.modulePackageJson, resolvedPath)) {
    return `Node module '${info.packageName}' has a typescript entrypoint that is unsupported`
  }
  return null
}

export function getNodeModuleUnresolvedError(
  importName: string,
  fsMap: Record<string, string>,
): string | null {
  const info = getNodeModuleInfo(importName, fsMap)

  // SCENARIO 1: Module not declared in package.json
  // Handle both false (not declared) and null (package.json missing/unparseable)
  // Both cases mean the module is not properly declared as a dependency
  if (info.declaredInRoot === false || info.declaredInRoot === null) {
    return `Node module imported but not in package.json '${info.packageName}'`
  }

  // SCENARIO 2: Module declared but no directory in node_modules
  if (info.declaredInRoot === true && info.moduleFiles.length === 0) {
    return `Node module '${info.packageName}' has no files in the node_modules directory`
  }

  // SCENARIO 3: Module has directory but no package.json
  if (info.declaredInRoot === true && info.modulePackageJson === null) {
    return `Node module '${info.packageName}' has a directory in node_modules but no package.json`
  }

  // SCENARIO 4: TypeScript entrypoint (unsupported)
  if (hasTypeScriptEntrypoint(info.modulePackageJson)) {
    return `Node module '${info.packageName}' has a typescript entrypoint that is unsupported`
  }

  // SCENARIO 5: Declared entrypoint doesn't exist
  if (info.modulePackageJson) {
    const declaredEntry = getEntrypointPath(info.modulePackageJson)
    if (
      declaredEntry &&
      !doesEntrypointExist(fsMap, info.packageName, declaredEntry)
    ) {
      // Special case: if it mentions dist but dist is empty
      if (declaredEntry.includes("dist/")) {
        return `Node module '${info.packageName}' has no files in dist, did you forget to transpile?`
      }
      // Otherwise generic missing entrypoint
      return `Node module '${info.packageName}' has no entry point at '${declaredEntry}'`
    }
  }

  // SCENARIO 6: Package.json exists but has no main/module/exports field
  if (
    info.declaredInRoot === true &&
    info.moduleFiles.length > 0 &&
    info.modulePackageJson
  ) {
    const entrypoint = getEntrypointPath(info.modulePackageJson)
    if (!entrypoint) {
      return `Node module '${info.packageName}' has no 'main', 'module', or 'exports' field in package.json`
    }
  }

  return null
}
