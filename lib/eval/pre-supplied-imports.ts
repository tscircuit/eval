import {
  getNodeBuiltinImportAliases,
  isExplicitNodeBuiltinSpecifier,
} from "./node-builtin-modules"

const npmResolvedImportsByMap = new WeakMap<Record<string, any>, Set<string>>()

const hasOwn = (preSuppliedImports: Record<string, any>, key: string) =>
  Object.prototype.hasOwnProperty.call(preSuppliedImports, key)

export const markNpmResolvedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => {
  let set = npmResolvedImportsByMap.get(preSuppliedImports)
  if (!set) {
    set = new Set<string>()
    npmResolvedImportsByMap.set(preSuppliedImports, set)
  }
  set.add(importName)
}

const isNpmResolvedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => npmResolvedImportsByMap.get(preSuppliedImports)?.has(importName) ?? false

const resolvePreSuppliedImportKey = (
  preSuppliedImports: Record<string, any>,
  importName: string,
): string | undefined => {
  if (hasOwn(preSuppliedImports, importName)) {
    return importName
  }

  for (const candidate of getNodeBuiltinImportAliases(importName)) {
    if (candidate === importName) continue
    if (
      isExplicitNodeBuiltinSpecifier(importName) &&
      isNpmResolvedImport(preSuppliedImports, candidate)
    ) {
      continue
    }
    if (hasOwn(preSuppliedImports, candidate)) {
      return candidate
    }
  }

  return undefined
}

export const hasPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => resolvePreSuppliedImportKey(preSuppliedImports, importName) !== undefined

export const getPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => {
  const key = resolvePreSuppliedImportKey(preSuppliedImports, importName)
  return key !== undefined ? preSuppliedImports[key] : undefined
}
