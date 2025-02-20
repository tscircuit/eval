export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
) {
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    // Direct match first
    if (preSuppliedImports[name]) {
      return preSuppliedImports[name]
    }
    // Only handle relative paths with explicit "./"
    if (name.startsWith("./") && preSuppliedImports[name.slice(2)]) {
      return preSuppliedImports[name.slice(2)]
    }
    throw new Error(`Import "${name}" not found`)
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
