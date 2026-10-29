import type { ExecutionContext } from "./execution-context"
import { hasPreSuppliedImport } from "./pre-supplied-imports"

export const isNodeBuiltinSpecifier = (importName: string): boolean => {
  return importName.startsWith("node:")
}

export const normalizeNodeBuiltinSpecifier = (importName: string): string => {
  return isNodeBuiltinSpecifier(importName)
    ? importName.slice("node:".length)
    : importName
}

export const resolvePreSuppliedNodeBuiltin = (
  preSuppliedImports: Record<string, any>,
  importName: string,
): boolean => {
  if (hasPreSuppliedImport(preSuppliedImports, importName)) {
    return true
  }

  if (!isNodeBuiltinSpecifier(importName)) {
    return false
  }

  const bareSpecifier = normalizeNodeBuiltinSpecifier(importName)
  if (hasPreSuppliedImport(preSuppliedImports, bareSpecifier)) {
    preSuppliedImports[importName] = preSuppliedImports[bareSpecifier]
    return true
  }

  return false
}

export const createUnsupportedNodeBuiltinError = (
  importName: string,
  ctx: ExecutionContext,
  opts: { cwd?: string } = {},
): Error => {
  const importingFile = ctx.importStack[ctx.importStack.length - 1] ?? opts.cwd
  const importedFromDetail = importingFile
    ? ` (imported from "${importingFile}")`
    : ""
  const bareSpecifier = normalizeNodeBuiltinSpecifier(importName)

  const remedy =
    bareSpecifier === "events"
      ? 'To fix this, use a declared browser-compatible event emitter package in package.json (such as "events" or "mitt") or keep Node-dependent regeneration code outside the browser entrypoint.'
      : "To fix this, use a declared browser-compatible package in package.json or keep Node-dependent code outside the browser entrypoint."

  return new Error(
    `Node built-in module "${importName}" is not available in this execution environment${importedFromDetail}. "${importName}" is a Node.js built-in module, not an npm package in package.json. ${remedy}\n\n${ctx.logger.stringifyLogs()}`,
  )
}
