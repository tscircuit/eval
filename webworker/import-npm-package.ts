import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import Debug from "debug"

const debug = Debug("tsci:eval:import-npm-package")

export async function importNpmPackage(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) {
  debug(`importing npm package: ${importName}`)
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return

  const npmCdnUrl = `https://unpkg.com/${importName}`

  const { content, error } = await globalThis
    .fetch(npmCdnUrl)
    .then(async (res) => {
      if (!res.ok)
        throw new Error(
          `Could not fetch "${importName}" from unpkg: ${res.statusText}`,
        )
      return { content: await res.text(), error: null }
    })
    .catch((e) => ({ error: e, content: null }))

  if (error) {
    console.error("Error fetching npm import", importName, error)
    throw error
  }

  const requireRegex = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g
  const dependencies = new Set<string>()
  let match
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = requireRegex.exec(content!))) {
    dependencies.add(match[1])
  }

  for (const dep of dependencies) {
    await importEvalPath(dep, ctx, depth + 1)
  }

  try {
    preSuppliedImports[importName] = evalCompiledJs(
      content!,
      preSuppliedImports,
    ).exports
  } catch (e: any) {
    throw new Error(`Eval npm package error for "${importName}": ${e.message}`)
  }
}
