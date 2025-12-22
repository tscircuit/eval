import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"
import { isStaticAssetPath } from "lib/shared/static-asset-extensions"

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  const { preSuppliedImports } = ctx
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/")

  const fetchOptions: RequestInit = {}
  if (ctx.tscircuitSessionToken) {
    fetchOptions.headers = {
      Authorization: `Bearer ${ctx.tscircuitSessionToken}`,
    }
  }

  const { cjs, error } = await globalThis
    .fetch(`${ctx.cjsRegistryUrl}/${fullSnippetName}`, fetchOptions)
    .then(async (res) => ({ cjs: await res.text(), error: null }))
    .catch((e) => ({ error: e, cjs: null }))

  if (error) {
    console.error("Error fetching import", importName, error)
    return
  }

  // Resolve transitive dependencies before evaluating
  const importNames = getImportsFromCode(cjs!)

  const staticAssetImports: { subImportName: string; assetUrl: string }[] = []
  const otherImports: string[] = []

  for (const subImportName of importNames) {
    if (!preSuppliedImports[subImportName]) {
      // required static assets can be fetched from: cjs.tscircuit.com/@tsci/author.package/assets/...
      if (subImportName.startsWith("./") && isStaticAssetPath(subImportName)) {
        const assetPath = subImportName.slice(2)
        const assetUrl = `${ctx.cjsRegistryUrl}/${importName}/${assetPath}`
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
    if (!preSuppliedImports[subImportName]) {
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
