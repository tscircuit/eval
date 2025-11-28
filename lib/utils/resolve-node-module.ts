import { dirname } from "./dirname"

type ExportValue = string | Record<string, string | Record<string, string>>

export interface PackageJson {
  main?: string
  module?: string
  exports?: Record<string, ExportValue>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

interface NodeResolutionContext {
  fsMap: Record<string, string>
  extensions: string[]
  basePath: string
  modulePath: string
}

function createContext(
  modulePath: string,
  fsMap: Record<string, string>,
  basePath: string,
): NodeResolutionContext {
  return {
    fsMap,
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    basePath,
    modulePath,
  }
}

function findPackageJson(nodeModulesPath: string, ctx: NodeResolutionContext) {
  const packageJsonPath = `${nodeModulesPath}/package.json`
  if (!ctx.fsMap[packageJsonPath]) return null
  try {
    return JSON.parse(ctx.fsMap[packageJsonPath]) as PackageJson
  } catch {
    return null
  }
}

function tryResolveWithExtensions(
  path: string,
  ctx: NodeResolutionContext,
): string | null {
  if (ctx.fsMap[path]) return path

  for (const ext of ctx.extensions) {
    const pathWithExt = path.replace(/\.js$|\.jsx$/, "") + ext
    if (ctx.fsMap[pathWithExt]) return pathWithExt
  }
  return null
}

function resolveExportPath(
  nodeModulesPath: string,
  exportPath: string,
  ctx: NodeResolutionContext,
): string | null {
  const fullExportPath = `${nodeModulesPath}/${exportPath.replace(/^\.\//, "")}`
  return tryResolveWithExtensions(fullExportPath, ctx)
}

function resolveConditionalExport(exportValue: ExportValue): string | null {
  if (typeof exportValue === "string") {
    return exportValue
  }

  // Handle conditional exports - try common conditions in order of preference
  const conditions = ["import", "default", "require", "node", "browser"]
  for (const condition of conditions) {
    if (exportValue[condition]) {
      const conditionValue = exportValue[condition]
      if (typeof conditionValue === "string") {
        return conditionValue
      }
      // Recursively handle nested conditions
      const resolved = resolveConditionalExport(conditionValue)
      if (resolved) return resolved
    }
  }

  return null
}

function resolvePackageExports(
  nodeModulesPath: string,
  packageJson: PackageJson,
  remainingPath: string,
  ctx: NodeResolutionContext,
): string | null {
  if (!packageJson.exports) return null

  // Handle default export condition (when no subpath)
  const defaultExport = packageJson.exports["."]
  if (remainingPath === "" && defaultExport) {
    const exportPath = resolveConditionalExport(defaultExport)
    if (exportPath) {
      const resolved = resolveExportPath(nodeModulesPath, exportPath, ctx)
      if (resolved) return resolved
    }
  }

  // Handle subpath exports
  const subpathExport = remainingPath
    ? packageJson.exports[`./${remainingPath}`]
    : null
  if (subpathExport) {
    const exportPath = resolveConditionalExport(subpathExport)
    if (exportPath) {
      const resolved = resolveExportPath(nodeModulesPath, exportPath, ctx)
      if (resolved) return resolved
    }
  }

  // Handle top-level conditional exports (legacy format)
  const importExport = packageJson.exports.import
  if (remainingPath === "" && importExport !== undefined) {
    const exportPath = resolveConditionalExport(importExport)
    if (exportPath) {
      const resolved = resolveExportPath(nodeModulesPath, exportPath, ctx)
      if (resolved) return resolved
    }
  }

  return null
}

function resolvePackageEntryPoint(
  nodeModulesPath: string,
  packageJson: PackageJson,
  ctx: NodeResolutionContext,
): string | null {
  const entryPoint = packageJson.module || packageJson.main || "index.js"
  const fullPath = `${nodeModulesPath}/${entryPoint}`
  return tryResolveWithExtensions(fullPath, ctx)
}

function resolveRemainingPath(
  nodeModulesPath: string,
  remainingPath: string,
  ctx: NodeResolutionContext,
): string | null {
  if (!remainingPath) {
    // Try index files in the module root
    for (const ext of ctx.extensions) {
      const indexPath = `${nodeModulesPath}/index${ext}`
      if (ctx.fsMap[indexPath]) return indexPath
    }
    return null
  }

  const fullPath = `${nodeModulesPath}/${remainingPath}`
  const directMatch = tryResolveWithExtensions(fullPath, ctx)
  if (directMatch) return directMatch

  // Try index files
  for (const ext of ctx.extensions) {
    const indexPath = `${fullPath}/index${ext}`
    if (ctx.fsMap[indexPath]) return indexPath
  }
  return null
}

function resolveNodeModuleInPath(
  searchPath: string,
  ctx: NodeResolutionContext,
): string | null {
  const moduleParts = ctx.modulePath.split("/")
  const scope = moduleParts[0].startsWith("@")
    ? moduleParts.slice(0, 2).join("/")
    : moduleParts[0]
  const remainingPath = moduleParts.slice(scope.includes("/") ? 2 : 1).join("/")
  const nodeModulesPath = `${searchPath === "." ? "" : `${searchPath}/`}node_modules/${scope}`

  // Try to find package.json
  const packageJson = findPackageJson(nodeModulesPath, ctx)
  if (packageJson) {
    // Try resolving through exports field
    const exportsResolution = resolvePackageExports(
      nodeModulesPath,
      packageJson,
      remainingPath,
      ctx,
    )
    if (exportsResolution) return exportsResolution

    // Try resolving through main/module fields
    const entryPointResolution = resolvePackageEntryPoint(
      nodeModulesPath,
      packageJson,
      ctx,
    )
    if (entryPointResolution) return entryPointResolution
  }

  // Try resolving remaining path
  const remainingPathResolution = resolveRemainingPath(
    nodeModulesPath,
    remainingPath,
    ctx,
  )
  if (remainingPathResolution) return remainingPathResolution

  // If not found and we have a parent directory, try there
  const parentPath = dirname(searchPath)
  if (parentPath && parentPath !== searchPath) {
    return resolveNodeModuleInPath(parentPath, ctx)
  }

  return null
}

export function resolveNodeModule(
  modulePath: string,
  fsMap: Record<string, string>,
  basePath: string,
): string | null {
  const ctx = createContext(modulePath, fsMap, basePath)
  return resolveNodeModuleInPath(ctx.basePath, ctx)
}
