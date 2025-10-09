import { resolveFilePath } from "lib/runner/resolveFilePath"

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    const resolvedFilePath = resolveFilePath(name, {
      fsMapOrAllFilePaths: preSuppliedImports,
      cwd,
    })

    const hasResolvedFilePath =
      resolvedFilePath && preSuppliedImports[resolvedFilePath]

    if (!preSuppliedImports[name] && !hasResolvedFilePath) {
      throw new Error(`Import "${name}" not found ${cwd ? `in "${cwd}"` : ""}`)
    }

    const mod =
      preSuppliedImports[name] || preSuppliedImports[resolvedFilePath!]
    return new Proxy(mod, {
      get(target, prop) {
        if (!(prop in target)) {
          if (prop === "default") {
            if (target.default !== undefined) {
              return target.default
            }

            if (target.__esModule) {
              return undefined
            }

            if (typeof target === "function" || typeof target === "object") {
              return target
            }

            return undefined
          }

          if (prop === "__esModule") {
            return true
          }

          throw new Error(
            `Component "${String(prop)}" is not exported by "${name}"`,
          )
        }

        return target[prop as keyof typeof target]
      },
    })
  }

  const functionBody = `
  var exports = {};
  var require = globalThis.__tscircuit_require;
  var module = { exports };
  var circuit = globalThis.__tscircuit_circuit;
  ${compiledCode};
  return module;`.trim()
  return Function(functionBody).call(globalThis)
}
