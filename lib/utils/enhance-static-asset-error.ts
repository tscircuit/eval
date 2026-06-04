const STATIC_ASSET_SENTINEL = "__STATIC_ASSET__"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export const isStaticAssetSentinelError = (error: unknown) =>
  getErrorMessage(error).includes(`${STATIC_ASSET_SENTINEL} is not defined`) ||
  getErrorMessage(error).includes(
    `Static asset placeholder "${STATIC_ASSET_SENTINEL}" was evaluated as JavaScript`,
  )

export const enhanceStaticAssetSentinelError = (
  error: unknown,
  opts: {
    importName?: string
    cwd?: string
  } = {},
) => {
  if (!isStaticAssetSentinelError(error)) {
    return error
  }

  const importContext = opts.importName
    ? ` while importing "${opts.importName}"`
    : ""
  const cwdContext = opts.cwd ? ` from "${opts.cwd}"` : ""
  const message = `Static asset placeholder ${JSON.stringify(
    STATIC_ASSET_SENTINEL,
  )} was evaluated as JavaScript${importContext}${cwdContext}. This usually means a browser fsMap or package resolver supplied a static asset placeholder as module source instead of a real file URL/content. Provide the asset contents, a blob URL, or configure platform.projectBaseUrl/staticFileLoaderMap for that asset.`

  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause
      : error instanceof Error
        ? error
        : undefined

  return new Error(message, { cause })
}
