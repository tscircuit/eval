import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"
import { isStaticAssetPath } from "lib/shared/static-asset-extensions"
import { hasPreSuppliedImport } from "./pre-supplied-imports"

type PackageRelease = {
  package_release_id: string
  has_transpiled: boolean
  is_pr_preview: boolean
}

const getPackageFileDownloadUrl = (
  params: { package_release_id: string; file_path: string },
  ctx: ExecutionContext,
) => {
  return `${ctx.snippetsApiBaseUrl.replace(/\/$/, "")}/package_files/download?${new URLSearchParams(params)}`
}

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  const { preSuppliedImports } = ctx
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/")

  const headers: Record<string, string> = {}
  if (ctx.tscircuitSessionToken) {
    headers.Authorization = `Bearer ${ctx.tscircuitSessionToken}`
  }
  const fetchOptions: RequestInit = { headers }

  let { cjs, error } = await globalThis
    .fetch(`${ctx.cjsRegistryUrl}/${fullSnippetName}`, fetchOptions)
    .then(async (res) => ({ cjs: await res.text(), error: null }))
    .catch((e) => ({ error: e, cjs: null }))

  if (error) {
    console.error("Error fetching import", importName, error)
    return
  }

  let fallbackPackageReleaseId: string | undefined

  // Check if the response is a JSON error (package not built)
  if (cjs?.startsWith("{")) {
    try {
      const jsonResponse = JSON.parse(cjs)
      const errorMessage = jsonResponse.error?.message ?? jsonResponse.error

      if (
        jsonResponse.ok === false &&
        errorMessage &&
        !fullSnippetName.includes("@") &&
        /not been built|bundle not found|no files in dist/i.test(errorMessage)
      ) {
        const release = await globalThis
          .fetch(`${ctx.snippetsApiBaseUrl}/package_releases/list`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ package_name: fullSnippetName }),
          })
          .then((res) => res.json())
          .then(({ package_releases }) =>
            package_releases.find(
              (release: PackageRelease) =>
                release.has_transpiled && !release.is_pr_preview,
            ),
          )
          .catch(() => null)

        if (release) {
          const response = await globalThis.fetch(
            getPackageFileDownloadUrl(
              {
                package_release_id: release.package_release_id,
                file_path: "dist/index.cjs",
              },
              ctx,
            ),
            fetchOptions,
          )
          if (response.ok) {
            cjs = await response.text()
            fallbackPackageReleaseId = release.package_release_id
          }
        }
      }

      if (!fallbackPackageReleaseId && jsonResponse.ok === false) {
        throw new Error(
          `"${importName}" has no files in dist, it may not be built`,
        )
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("has no files in dist")) {
        throw e
      }
      throw new Error(`Error parsing cjs response: ${e}`)
    }
  }

  // Resolve transitive dependencies before evaluating
  const importNames = getImportsFromCode(cjs!)

  const staticAssetImports: { subImportName: string; assetUrl: string }[] = []
  const otherImports: string[] = []

  for (const subImportName of importNames) {
    if (!hasPreSuppliedImport(preSuppliedImports, subImportName)) {
      // required static assets can be fetched from: cjs.tscircuit.com/@tsci/author.package/assets/...
      if (subImportName.startsWith("./") && isStaticAssetPath(subImportName)) {
        const assetPath = subImportName.slice(2)
        const assetUrl = fallbackPackageReleaseId
          ? getPackageFileDownloadUrl(
              {
                package_release_id: fallbackPackageReleaseId,
                file_path: `dist/${assetPath}`,
              },
              ctx,
            )
          : `${ctx.cjsRegistryUrl}/${importName}/${assetPath}`
        staticAssetImports.push({ subImportName, assetUrl })
      } else {
        otherImports.push(subImportName)
      }
    }
  }

  // Fetch all static assets in parallel and create blob URLs
  await Promise.all(
    staticAssetImports.map(async ({ subImportName, assetUrl }) => {
      try {
        const response = await globalThis.fetch(assetUrl, fetchOptions)
        if (!response.ok) {
          throw new Error(`Failed to fetch asset: ${response.statusText}`)
        }
        const blob = await response.blob()
        const extension = subImportName.split(".").pop() || ""
        const blobUrl = `${URL.createObjectURL(blob)}#ext=${extension}`
        preSuppliedImports[subImportName] = {
          __esModule: true,
          default: blobUrl,
        }
      } catch (e) {
        console.error(`Error fetching static asset ${assetUrl}:`, e)
        // Fallback to using the URL directly if blob creation fails
        preSuppliedImports[subImportName] = {
          __esModule: true,
          default: assetUrl,
        }
      }
    }),
  )

  // Process other imports sequentially
  for (const subImportName of otherImports) {
    if (!hasPreSuppliedImport(preSuppliedImports, subImportName)) {
      await importEvalPath(subImportName, ctx, depth + 1)
    }
  }

  try {
    preSuppliedImports[importName] = evalCompiledJs(
      cjs!,
      preSuppliedImports,
    ).exports
  } catch (e) {
    console.error("Error importing snippet", e)
  }
}
