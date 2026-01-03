import { extractBasePackageName } from "./extractBasePackageName"

const moduleExtensions = [".js", ".jsx", ".ts", ".tsx", ".json"]

export const resolveEntrypointPath = (
  packageName: string,
  entrypoint: string,
  fsMap: Record<string, string>,
): string | null => {
  const basePackageName = extractBasePackageName(packageName)
  const entrypointPath = `node_modules/${basePackageName}/${entrypoint}`

  if (fsMap[entrypointPath]) {
    return entrypointPath
  }

  for (const ext of moduleExtensions) {
    const pathWithExt = entrypointPath.replace(/\.js$|\.jsx$/, "") + ext
    if (fsMap[pathWithExt]) return pathWithExt
  }

  return null
}
