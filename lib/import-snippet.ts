import { getImportsFromCode } from "@tscircuit/prompt-benchmarks/code-runner-utils"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import * as Babel from "@babel/standalone"
import { importLocalFile } from "./import-local-file"
import { importEvalPath } from "./import-eval-path"

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  const { preSuppliedImports } = ctx
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/")
  const { snippet: importedSnippet, error } = await fetch(
    `${ctx.snippetsApiBaseUrl}/snippets/get?name=${fullSnippetName}`,
  )
    .then((res) => res.json())
    .catch((e) => ({ error: e }))

  if (error) {
    console.error("Error fetching import", importName, error)
    return
  }

  const { compiled_js, code } = importedSnippet

  const importNames = getImportsFromCode(code!)

  for (const importName of importNames) {
    if (!preSuppliedImports[importName]) {
      await importEvalPath(importName, ctx, depth + 1)
    }
  }

  try {
    preSuppliedImports[importName] = evalCompiledJs(
      compiled_js,
      preSuppliedImports,
    ).exports
  } catch (e) {
    console.error("Error importing snippet", e)
  }
}
