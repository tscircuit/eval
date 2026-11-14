const NODE_BUILTIN_MODULES = new Set([
  "assert",
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
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
])

export const isNodeBuiltinModule = (importName: string): boolean => {
  if (importName.startsWith("node:")) return true
  const baseModule = importName.split("/")[0]
  return NODE_BUILTIN_MODULES.has(baseModule)
}

export const getPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => {
  if (Object.prototype.hasOwnProperty.call(preSuppliedImports, importName)) {
    return preSuppliedImports[importName]
  }
  if (!isNodeBuiltinModule(importName)) {
    return undefined
  }
  const alternate = importName.startsWith("node:")
    ? importName.slice("node:".length)
    : `node:${importName}`
  if (Object.prototype.hasOwnProperty.call(preSuppliedImports, alternate)) {
    return preSuppliedImports[alternate]
  }
  return undefined
}

export const hasPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => {
  if (Object.prototype.hasOwnProperty.call(preSuppliedImports, importName)) {
    return true
  }
  if (!isNodeBuiltinModule(importName)) {
    return false
  }
  const alternate = importName.startsWith("node:")
    ? importName.slice("node:".length)
    : `node:${importName}`
  return Object.prototype.hasOwnProperty.call(preSuppliedImports, alternate)
}
