import type { ExecutionContext } from "./execution-context"

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
  "sys",
  "test",
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

export const isNodeBuiltinSpecifier = (importName: string): boolean => {
  return importName.startsWith("node:")
}

export const getNodeBuiltinBaseName = (importName: string): string => {
  const withoutPrefix = importName.startsWith("node:")
    ? importName.slice("node:".length)
    : importName
  return withoutPrefix.split("/")[0] || withoutPrefix
}

export const isKnownNodeBuiltinModule = (importName: string): boolean => {
  return NODE_BUILTIN_MODULES.has(getNodeBuiltinBaseName(importName))
}

export const createUnavailableNodeBuiltinError = (
  importName: string,
  ctx: ExecutionContext,
  opts: { cwd?: string } = {},
): Error => {
  const importingFile =
    ctx.importStack[ctx.importStack.length - 1] ||
    (opts.cwd && opts.cwd !== "." ? opts.cwd : undefined) ||
    ctx.entrypoint ||
    undefined
  const importedFromClause = importingFile
    ? ` (imported from "${importingFile}")`
    : ""

  const baseName = getNodeBuiltinBaseName(importName)
  const remedy =
    baseName === "events"
      ? `Declare and import a browser-compatible event emitter package in package.json (for example "events" or "mitt"), or keep Node-dependent regeneration code outside the browser entrypoint.`
      : `Use a browser-compatible package declared in package.json, or keep Node-dependent code outside the browser entrypoint.`

  const logs = ctx.logger.stringifyLogs()
  return new Error(
    `Node built-in module "${importName}"${importedFromClause} is not available in this execution environment. ${remedy}${logs ? `\n\n${logs}` : ""}`,
  )
}
