export const hasPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => Object.prototype.hasOwnProperty.call(preSuppliedImports, importName)
