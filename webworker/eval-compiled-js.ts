import { resolveFilePath } from "lib/runner/resolveFilePath"

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    if (name.startsWith("./")) {
      const resolvedFilePath = resolveFilePath(
        name.slice(2),
        preSuppliedImports,
      )
      if (resolvedFilePath && preSuppliedImports[resolvedFilePath]) {
        return preSuppliedImports[resolvedFilePath]
      }
    }
    if (!preSuppliedImports[name]) {
      throw new Error(`Import "${name}" not found`)
    }

    const mod = preSuppliedImports[name]
    return new Proxy(mod, {
      get(target, prop) {
        if (!(prop in target)) {
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
