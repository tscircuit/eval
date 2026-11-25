import type { ExecutionContext } from "./execution-context"

const BARE_NODE_BUILTIN_MODULES = new Set<string>([
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "inspector/promises",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "readline/promises",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
])

export class UnsupportedNodeBuiltinError extends Error {
  override name = "UnsupportedNodeBuiltinError"
}

export const isExplicitNodeBuiltinSpecifier = (importName: string): boolean =>
  importName.startsWith("node:") && importName.length > "node:".length

export const isNodeBuiltinModuleName = (importName: string): boolean =>
  isExplicitNodeBuiltinSpecifier(importName) ||
  BARE_NODE_BUILTIN_MODULES.has(importName)

export const getNodeBuiltinImportAliases = (importName: string): string[] => {
  if (isExplicitNodeBuiltinSpecifier(importName)) {
    const bareName = importName.slice("node:".length)
    return BARE_NODE_BUILTIN_MODULES.has(bareName)
      ? [importName, bareName]
      : [importName]
  }

  if (BARE_NODE_BUILTIN_MODULES.has(importName)) {
    return [importName, `node:${importName}`]
  }

  return [importName]
}

const getNodeBuiltinRemedy = (importName: string): string => {
  const bareName = isExplicitNodeBuiltinSpecifier(importName)
    ? importName.slice("node:".length)
    : importName
  const baseModule = bareName.split("/")[0]

  if (baseModule === "events") {
    return 'Use a declared browser-compatible event emitter dependency (such as "events", "mitt", or "eventemitter3") or keep Node-dependent code outside the browser entrypoint.'
  }

  if (
    baseModule === "fs" ||
    baseModule === "child_process" ||
    baseModule === "os" ||
    baseModule === "net" ||
    baseModule === "tls" ||
    baseModule === "dgram" ||
    baseModule === "cluster" ||
    baseModule === "worker_threads" ||
    baseModule === "readline" ||
    baseModule === "repl" ||
    baseModule === "vm" ||
    baseModule === "module" ||
    baseModule === "wasi" ||
    baseModule === "sqlite" ||
    baseModule === "sea"
  ) {
    return "Keep filesystem or Node-dependent runtime logic outside the browser entrypoint, or precompute and import static data instead."
  }

  return "Use standard Web APIs or a declared browser-compatible npm alternative, or keep Node-dependent code outside the browser entrypoint."
}

export const createUnsupportedNodeBuiltinError = (
  importName: string,
  ctx: Pick<ExecutionContext, "importStack" | "entrypoint" | "logger">,
): UnsupportedNodeBuiltinError => {
  const importingFile =
    ctx.importStack[ctx.importStack.length - 1] ||
    (ctx.entrypoint ? ctx.entrypoint.replace(/^\.\//, "") : undefined)
  const importedByClause = importingFile
    ? ` (imported by "${importingFile}")`
    : ""
  const remedy = getNodeBuiltinRemedy(importName)
  const detail = `Node.js built-in module "${importName}"${importedByClause} is not available in this execution environment. ${remedy}`
  const logs = ctx.logger.stringifyLogs()

  return new UnsupportedNodeBuiltinError(logs ? `${detail}\n\n${logs}` : detail)
}
