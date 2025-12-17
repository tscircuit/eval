import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  const { preSuppliedImports } = ctx
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/")

  const { cjs, error } = await globalThis
    .fetch(`${ctx.cjsRegistryUrl}/${fullSnippetName}`)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(
          `Failed to fetch snippet "${importName}": ${res.status} ${res.statusText}`,
        )
      }
      return { cjs: await res.text(), error: null }
    })
    .catch((e) => ({ error: e, cjs: null }))

  if (error) {
    console.error("Error fetching import", importName, error)
    return
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
