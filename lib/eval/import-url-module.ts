/**
 * Specifiers that point at a real URL (e.g. a blob: URL a package created with
 * URL.createObjectURL) can't come from preSuppliedImports, so they are loaded
 * with the runtime's native import()
 */
export const isUrlSpecifier = (name: string) =>
  /^(blob|data|https?):/.test(name)

/**
 * Sucrase compiles `import(x)` to `Promise.resolve().then(() =>
 * _interopRequireWildcard(require(x)))`. Marking the native import() promise
 * as an ES module makes _interopRequireWildcard return it untouched, so the
 * outer promise resolves to the real module namespace.
 */
export const importUrlForDynamicImport = (url: string) => {
  const modulePromise: any = import(/* @vite-ignore */ url)
  modulePromise.__esModule = true
  return modulePromise
}
