import { transform, type Transform as SucraseTransform } from "sucrase"

const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"])
const JSX_EXTENSIONS = new Set([".tsx", ".jsx", ".ts"])

const stripQueryAndHash = (filePath: string) => {
  const queryIndex = filePath.indexOf("?")
  const hashIndex = filePath.indexOf("#")

  let endIndex = filePath.length

  if (queryIndex !== -1 && hashIndex !== -1) {
    endIndex = Math.min(queryIndex, hashIndex)
  } else if (queryIndex !== -1) {
    endIndex = queryIndex
  } else if (hashIndex !== -1) {
    endIndex = hashIndex
  }

  return filePath.slice(0, endIndex)
}

const getExtension = (filePath: string) => {
  const normalizedPath = stripQueryAndHash(filePath)
  const lastDotIndex = normalizedPath.lastIndexOf(".")

  if (lastDotIndex === -1) {
    return ""
  }

  const lastSlashIndex = Math.max(
    normalizedPath.lastIndexOf("/"),
    normalizedPath.lastIndexOf("\\"),
  )

  if (lastSlashIndex > lastDotIndex) {
    return ""
  }

  return normalizedPath.slice(lastDotIndex).toLowerCase()
}

const getTransformsForFilePath = (filePath: string) => {
  const extension = getExtension(filePath)

  const transforms: SucraseTransform[] = ["imports"]

  if (TS_EXTENSIONS.has(extension)) {
    transforms.unshift("typescript")
  }

  if (JSX_EXTENSIONS.has(extension)) {
    transforms.push("jsx")
  }

  return transforms
}

export const transformWithSucrase = (code: string, filePath: string) => {
  const transforms = getTransformsForFilePath(filePath)
  const { code: transformedCode } = transform(code, {
    filePath,
    production: true,
    transforms,
  })

  return transformedCode
}
