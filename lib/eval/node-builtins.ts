export const NODE_BUILTIN_MODULES = new Set([
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

export function isNodeBuiltin(importName: string): boolean {
  if (importName.startsWith("node:")) {
    return true
  }
  return NODE_BUILTIN_MODULES.has(importName)
}

export function getNodeBuiltinRemedy(importName: string): string {
  const normalized = importName.startsWith("node:")
    ? importName.slice(5)
    : importName

  if (normalized === "events") {
    return "Use a browser-compatible event emitter (such as 'eventemitter3' or 'mitt') or keep Node-dependent code outside the browser entrypoint."
  }
  if (normalized === "path") {
    return "Use a browser-compatible path utility (such as 'path-browserify') or keep file-system path operations outside the browser entrypoint."
  }
  if (normalized === "fs" || normalized === "fs/promises") {
    return "File system access is not available in the browser execution environment. Keep file-system operations outside the browser entrypoint."
  }
  if (normalized === "buffer") {
    return "Use the 'buffer' package from npm or browser-compatible Uint8Array APIs."
  }
  if (normalized === "stream" || normalized.startsWith("stream/")) {
    return "Use web standard Streams APIs (ReadableStream/WritableStream) or a browser-compatible stream polyfill."
  }
  if (normalized === "crypto") {
    return "Use the web standard crypto API (globalThis.crypto) or a browser-compatible polyfill."
  }
  return `Keep Node.js-dependent code outside the browser entrypoint or replace "${importName}" with a browser-compatible alternative.`
}

export function getNodeBuiltinUnavailableError(
  importName: string,
  importingFile?: string,
  logs?: string,
): string {
  const fileContext = importingFile ? ` (imported by "${importingFile}")` : ""
  const remedy = getNodeBuiltinRemedy(importName)
  const logsContext = logs ? `\n\n${logs}` : ""

  return `Node built-in module "${importName}" is unavailable in this execution environment${fileContext}.\nRemedy: ${remedy}${logsContext}`
}
