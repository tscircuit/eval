import { resolveFilePath } from "lib/runner/resolveFilePath"
import { resolveNodeModule } from "lib/utils/resolve-node-module"
import { hasPreSuppliedImport } from "./pre-supplied-imports"

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

function createEvalRequire(
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  return (name: string) => {
    let resolvedFilePath = resolveFilePath(name, preSuppliedImports, cwd)

    if (!resolvedFilePath && !name.startsWith(".") && !name.startsWith("/")) {
      resolvedFilePath = resolveNodeModule(name, preSuppliedImports, cwd || "")
    }

    const hasResolvedFilePath =
      resolvedFilePath &&
      hasPreSuppliedImport(preSuppliedImports, resolvedFilePath)

    if (
      !hasPreSuppliedImport(preSuppliedImports, name) &&
      !hasResolvedFilePath
    ) {
      throw new Error(`Import "${name}" not found ${cwd ? `in "${cwd}"` : ""}`)
    }

    const mod = hasPreSuppliedImport(preSuppliedImports, name)
      ? preSuppliedImports[name]
      : preSuppliedImports[resolvedFilePath!]

    // If the module is a simple ES module with only default export (like static assets),
    // return the default value directly for CommonJS interop
    // e.g., require('./assets/file.glb') should return the URL string, not a module object
    if (mod.__esModule && mod.default !== undefined) {
      const modKeys = Object.keys(mod)
      const isSimpleDefaultExport =
        modKeys.length === 2 &&
        modKeys.includes("__esModule") &&
        modKeys.includes("default")

      if (isSimpleDefaultExport) {
        return mod.default
      }
    }

    // If the module has a default export that's a function, return a callable
    // proxy that allows both `mod()` and `mod.namedExport` patterns
    // This handles CommonJS interop where `var mm = require('pkg'); mm(val)` is used
    if (mod.default && typeof mod.default === "function") {
      // Create a function wrapper that calls the default export
      const callableWrapper = (...args: any[]) => {
        return mod.default(...args)
      }
      // Copy all properties from the module to the wrapper
      Object.assign(callableWrapper, mod)
      // Ensure __esModule is set
      ;(callableWrapper as any).__esModule = true
      return callableWrapper
    }

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

          if (prop === "__typeOnlyExports__") {
            return target.__typeOnlyExports__ || []
          }

          const typeExports: string[] = target.__typeOnlyExports__ || []
          const propName = String(prop)
          if (typeExports.includes(propName)) {
            throw new Error(
              `"${propName}" is a type exported by "${name}" and cannot be imported as a value.\nUse "export type { ${propName} }" instead of "export { ${propName} }"`,
            )
          }

          throw new Error(
            `"${propName}" is not exported by "${name}".\nIf "${propName}" is a type, use "export type { ${propName} }" instead of "export { ${propName} }"`,
          )
        }

        return target[prop as keyof typeof target]
      },
    })
  }
}

function createEvalFunctionBody(compiledCode: string) {
  return `
  var exports = {};
  var require = __tscircuit_local_require;
  var module = { exports };
  var circuit = __tscircuit_local_circuit;
  ${compiledCode};
  return module;`.trim()
}

export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  const localRequire = createEvalRequire(preSuppliedImports, cwd)
  ;(globalThis as any).__tscircuit_require = localRequire

  const functionBody = createEvalFunctionBody(compiledCode)
  return Function(
    "__tscircuit_local_require",
    "__tscircuit_local_circuit",
    functionBody,
  ).call(globalThis, localRequire, (globalThis as any).__tscircuit_circuit)
}

export async function evalCompiledJsAsync(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
  cwd?: string,
) {
  const localRequire = createEvalRequire(preSuppliedImports, cwd)
  ;(globalThis as any).__tscircuit_require = localRequire
  const localCircuit = (globalThis as any).__tscircuit_circuit

  const functionBody = createEvalFunctionBody(compiledCode)
  let fn: (...args: any[]) => any
  try {
    fn = Function(
      "__tscircuit_local_require",
      "__tscircuit_local_circuit",
      functionBody,
    ) as (...args: any[]) => any
  } catch (error) {
    if (error instanceof SyntaxError && /\bawait\b/.test(compiledCode)) {
      fn = AsyncFunction(
        "__tscircuit_local_require",
        "__tscircuit_local_circuit",
        functionBody,
      ) as (...args: any[]) => any
    } else {
      throw error
    }
  }
  return await fn.call(globalThis, localRequire, localCircuit)
}
