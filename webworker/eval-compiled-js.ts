import { resolveFilePath } from "lib/runner/resolveFilePath"

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    const resolvedFilePath = resolveFilePath(name, preSuppliedImports, cwd)

    const hasResolvedFilePath =
      resolvedFilePath && preSuppliedImports[resolvedFilePath]

    if (!preSuppliedImports[name] && !hasResolvedFilePath) {
      throw new Error(`Import "${name}" not found (imports available: ${Object.keys(preSuppliedImports).join(",")}) ${cwd ? `in "${cwd}"` : ""}`)
    }

    const mod =
      preSuppliedImports[name] || preSuppliedImports[resolvedFilePath!]
    return new Proxy(mod, {
      get(target, prop) {
        if (!(prop in target)) {
          if (prop === "default") {
            const defaultExport = Object.entries(target)
              .find(([key]) => !key.startsWith("use"))?.[1]
            
            if (!defaultExport) {
              throw new Error(`Module "${name}" does not have a valid default export`)
            }
            return defaultExport
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
