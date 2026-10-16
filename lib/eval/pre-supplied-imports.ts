export const hasPreSuppliedImport = (
  preSuppliedImports: Record<string, any>,
  importName: string,
) => {
  if (Object.prototype.hasOwnProperty.call(preSuppliedImports, importName)) {
    return true
  }

  if (importName.startsWith("node:")) {
    const bareName = importName.slice("node:".length)
    if (Object.prototype.hasOwnProperty.call(preSuppliedImports, bareName)) {
      preSuppliedImports[importName] = preSuppliedImports[bareName]
      return true
    }
  } else if (
    Object.prototype.hasOwnProperty.call(
      preSuppliedImports,
      `node:${importName}`,
    )
  ) {
    preSuppliedImports[importName] = preSuppliedImports[`node:${importName}`]
    return true
  }

  return false
}
