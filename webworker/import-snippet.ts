import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  const { preSuppliedImports } = ctx
  if (preSuppliedImports[importName]) {
    return
  }
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/")
  const snippetUrl = `${ctx.cjsRegistryUrl}/${fullSnippetName}`

  let cjs: string
  try {
    const res = await fetch(snippetUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    cjs = await res.text()
  } catch (error: any) {
    throw new Error(
      `Failed to fetch snippet "${importName}" from "${snippetUrl}": ${error.message}. This request may be blocked by your Content Security Policy.`,
    )
  }

  try {
    preSuppliedImports[importName] = evalCompiledJs(
      cjs,
      preSuppliedImports,
    ).exports
  } catch (error: any) {
    throw new Error(`Error importing snippet "${importName}": ${error.message}`)
  }
}
