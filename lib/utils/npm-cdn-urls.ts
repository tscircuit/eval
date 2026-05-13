const JSCDN_ORIGIN = "https://jscdn.tscircuit.com"

type ParsedNpmSpecifier = {
  packageName: string
  version: string
  filePath?: string
}

export function getJscdnPackageUrl(importName: string): string {
  const parsedSpecifier = parseNpmSpecifier(importName)
  const pathParts = [parsedSpecifier.packageName, parsedSpecifier.version]

  if (parsedSpecifier.filePath) {
    pathParts.push(parsedSpecifier.filePath)
  }

  return `${JSCDN_ORIGIN}/${pathParts.join("/")}`
}

function parseNpmSpecifier(importName: string): ParsedNpmSpecifier {
  const pathParts = importName.split("/")

  if (importName.startsWith("@")) {
    const packageName = pathParts.slice(0, 2).join("/")
    const packageNameWithVersion = pathParts[1] ?? ""
    const versionSeparatorIndex = packageNameWithVersion.indexOf("@")
    let version = "latest"
    let parsedPackageName = packageName

    if (versionSeparatorIndex !== -1) {
      version = packageNameWithVersion.slice(versionSeparatorIndex + 1)
      parsedPackageName = `${pathParts[0]}/${packageNameWithVersion.slice(
        0,
        versionSeparatorIndex,
      )}`
    }

    const filePath = pathParts.slice(2).join("/")

    return {
      packageName: parsedPackageName,
      version,
      filePath: filePath || undefined,
    }
  }

  const packageNameWithVersion = pathParts[0] ?? importName
  const versionSeparatorIndex = packageNameWithVersion.indexOf("@")
  let packageName = packageNameWithVersion
  let version = "latest"

  if (versionSeparatorIndex !== -1) {
    packageName = packageNameWithVersion.slice(0, versionSeparatorIndex)
    version = packageNameWithVersion.slice(versionSeparatorIndex + 1)
  }

  const filePath = pathParts.slice(1).join("/")

  return {
    packageName,
    version,
    filePath: filePath || undefined,
  }
}
