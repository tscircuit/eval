// Node.js builtin modules that third-party packages sometimes require even
// though they are never actually used in the tscircuit eval environment
// (e.g. `typescript`'s watchGuard.js does `require("fs")`). The eval import
// resolver has no filesystem/CDN concept of these, so without special-casing
// them the resolver throws while trying to resolve a dependency.
export const NODE_BUILTIN_MODULES = new Set([
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

/**
 * Returns true when `importName` refers to a Node.js builtin module, including
 * the `node:`-prefixed form and subpath imports like `fs/promises` or
 * `node:stream/web`.
 */
export const isNodeBuiltin = (importName: string): boolean => {
  const withoutPrefix = importName.startsWith("node:")
    ? importName.slice("node:".length)
    : importName
  const base = withoutPrefix.split("/")[0]
  return NODE_BUILTIN_MODULES.has(base)
}

/**
 * Builds a permissive stub for a Node builtin module. The eval environment
 * cannot actually provide these modules, so the stub simply lets resolution
 * succeed: any property access returns `undefined` instead of throwing, so a
 * bundled package that merely references a builtin (rather than using it) does
 * not blow up the eval.
 */
export const createNodeBuiltinStub = () =>
  new Proxy({ __esModule: true } as Record<string | symbol, unknown>, {
    get(target, prop) {
      if (prop === "__esModule") return true
      if (prop in target) return target[prop]
      return undefined
    },
    // Report every property as present so the outer require() proxy in
    // eval-compiled-js resolves accesses through this stub (returning
    // undefined) instead of throwing "not exported".
    has() {
      return true
    },
  })
