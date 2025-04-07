import { resolveFilePath } from "lib/runner/resolveFilePath"

function tryResolveNodeModules(
  name: string,
  preSuppliedImports: Record<string, any>,
) {
  // Try node_modules/package/index
  const indexPath = `node_modules/${name}/index`
  if (preSuppliedImports[indexPath]) {
    return indexPath
  }

  // Try direct node_modules/package
  const directPath = `node_modules/${name}`
  if (preSuppliedImports[directPath]) {
    return directPath
  }

  return null
}

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    // First try direct import
    if (preSuppliedImports[name]) {
      const mod = preSuppliedImports[name]
      return createModuleProxy(mod, name)
    }

    // Then try resolving relative/absolute paths
    const resolvedFilePath = resolveFilePath(name, preSuppliedImports, cwd)
    if (resolvedFilePath && preSuppliedImports[resolvedFilePath]) {
      const mod = preSuppliedImports[resolvedFilePath]
      return createModuleProxy(mod, name)
    }

    // Finally try node_modules resolution
    if (!name.startsWith("./") && !name.startsWith("../")) {
      const nodeModulesPath = tryResolveNodeModules(name, preSuppliedImports)
      if (nodeModulesPath) {
        const mod = preSuppliedImports[nodeModulesPath]
        return createModuleProxy(mod, name)
      }
    }

    throw new Error(`Import "${name}" not found ${cwd ? `in "${cwd}"` : ""}`)
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

function createModuleProxy(mod: any, name: string) {
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
