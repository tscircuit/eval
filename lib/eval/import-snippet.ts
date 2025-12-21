import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"

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
  for (const subImportName of importNames) {
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
