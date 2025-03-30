import { resolveFilePath } from "lib/runner/resolveFilePath"

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    const resolvedFilePath = resolveFilePath(name, preSuppliedImports, cwd)
console.log(69, resolvedFilePath, name)
    const hasResolvedFilePath =
      resolvedFilePath && preSuppliedImports[resolvedFilePath]
console.log(71, hasResolvedFilePath,preSuppliedImports[name], Object.keys(preSuppliedImports).includes(name))
    if (!preSuppliedImports[name] && !hasResolvedFilePath) {
      throw new Error(`Import "${name}" not found ${cwd ? `in "${cwd}"` : ""}`)
    }

    const mod =
      preSuppliedImports[name] || preSuppliedImports[resolvedFilePath!]
    return new Proxy(mod, {
      get(target, prop) {
        if (!(prop in target)) {
          if (prop === "default") {
            return undefined
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
