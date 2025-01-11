export function evalCompiledJs(
  compiledCode: string,
  preSuppliedImports: Record<string, any>,
) {
  // Ensure React is globally available
  if (
    typeof (globalThis as any).React === "undefined" &&
    preSuppliedImports.react
  ) {
    ;(globalThis as any).React = preSuppliedImports.react
  }
  ;(globalThis as any).__tscircuit_require = (name: string) => {
    // Try both with and without ./ prefix
    const normalizedName = name.startsWith("./") ? name.slice(2) : name
    const prefixedName = name.startsWith("./") ? name : `./${name}`

    if (preSuppliedImports[normalizedName]) {
      return preSuppliedImports[normalizedName]
    }
    if (preSuppliedImports[prefixedName]) {
      return preSuppliedImports[prefixedName]
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
