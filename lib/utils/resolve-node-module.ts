import { dirname } from "./dirname"

interface PackageJson {
  main?: string
  module?: string
  exports?: Record<string, string | Record<string, string>>
}

export function resolveNodeModule(
  modulePath: string,
  fsMap: Record<string, string>,
  basePath: string,
): string | null {
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".json"]

  function tryResolveInNodeModules(searchPath: string): string | null {
    const moduleParts = modulePath.split("/")
    const scope = moduleParts[0].startsWith("@")
      ? moduleParts.slice(0, 2).join("/")
      : moduleParts[0]
    const remainingPath = moduleParts
      .slice(scope.includes("/") ? 2 : 1)
      .join("/")
    const nodeModulesPath = `${searchPath == "." ? "" : `${searchPath}/`}node_modules/${scope}`

    // Try to find package.json
    const packageJsonPath = `${nodeModulesPath}/package.json`
    if (fsMap[packageJsonPath]) {
      try {
        const packageJson: PackageJson = JSON.parse(fsMap[packageJsonPath])

        // Check for exports field first
        if (packageJson.exports) {
          // Handle default export condition
          if (
            remainingPath === "" &&
            packageJson.exports["."] &&
            typeof packageJson.exports["."] === "string"
          ) {
            const exportPath = packageJson.exports["."] as string
            const fullExportPath = `${nodeModulesPath}/${exportPath.replace(/^\.\//, "")}`

            // Check if the export path exists
            if (fsMap[fullExportPath]) return fullExportPath

            // Try with extensions
            for (const ext of extensions) {
              const pathWithExt =
                fullExportPath.replace(/\.js$|\.jsx$/, "") + ext
              if (fsMap[pathWithExt]) return pathWithExt
            }
          }

          // Handle subpath exports
          if (
            remainingPath &&
            packageJson.exports[`./${remainingPath}`] &&
            typeof packageJson.exports[`./${remainingPath}`] === "string"
          ) {
            const exportPath = packageJson.exports[
              `./${remainingPath}`
            ] as string
            const fullExportPath = `${nodeModulesPath}/${exportPath.replace(/^\.\//, "")}`

            // Check if the export path exists
            if (fsMap[fullExportPath]) return fullExportPath

            // Try with extensions
            for (const ext of extensions) {
              const pathWithExt =
                fullExportPath.replace(/\.js$|\.jsx$/, "") + ext
              if (fsMap[pathWithExt]) return pathWithExt
            }
          }

          // Handle conditional exports
          if (
            remainingPath === "" &&
            packageJson.exports["import"] &&
            typeof packageJson.exports["import"] === "string"
          ) {
            const exportPath = packageJson.exports["import"] as string
            const fullExportPath = `${nodeModulesPath}/${exportPath.replace(/^\.\//, "")}`

            // Check if the export path exists
            if (fsMap[fullExportPath]) return fullExportPath

            // Try with extensions
            for (const ext of extensions) {
              const pathWithExt =
                fullExportPath.replace(/\.js$|\.jsx$/, "") + ext
              if (fsMap[pathWithExt]) return pathWithExt
            }
          }
        }

        // Fall back to module/main fields if exports didn't resolve
        const entryPoint = packageJson.module || packageJson.main || "index.js"
        const fullPath = `${nodeModulesPath}/${entryPoint}`

        // Check if the entry point exists
        if (fsMap[fullPath]) return fullPath

        // Try with extensions
        for (const ext of extensions) {
          const pathWithExt = fullPath.replace(/\.js$|\.jsx$/, "") + ext
          if (fsMap[pathWithExt]) return pathWithExt
        }
      } catch (error) {
        // Silently continue if package.json parsing fails
      }
    }

    // If there's a remaining path, try to resolve it
    if (remainingPath) {
      const fullPath = `${nodeModulesPath}/${remainingPath}`
      if (fsMap[fullPath]) return fullPath

      // Try with extensions
      for (const ext of extensions) {
        const pathWithExt = fullPath + ext
        if (fsMap[pathWithExt]) return pathWithExt
      }

      // Try index files
      for (const ext of extensions) {
        const indexPath = `${fullPath}/index${ext}`
        if (fsMap[indexPath]) return indexPath
      }
    } else {
      // Try index files in the module root
      for (const ext of extensions) {
        const indexPath = `${nodeModulesPath}/index${ext}`
        if (fsMap[indexPath]) return indexPath
      }
    }

    // If not found and we have a parent directory, try there
    const parentPath = dirname(searchPath)
    if (parentPath && parentPath !== searchPath) {
      return tryResolveInNodeModules(parentPath)
    }

    return null
  }

  return tryResolveInNodeModules(basePath)
}
