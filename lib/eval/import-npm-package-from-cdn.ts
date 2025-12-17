import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { dirname } from "lib/utils/dirname"
import Debug from "debug"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"
import { transformWithSucrase } from "lib/transpile/transform-with-sucrase"

const debug = Debug("tsci:eval:import-npm-package")

const JSDELIVR_PREFIX = "https://cdn.jsdelivr.net/npm/"
const TSCIRCUIT_NPM_REGISTRY = "https://npm.tscircuit.com/"

function extractPackagePathFromNpmUrl(url: string) {
  const normalizedUrl = url.replace(/\/\+esm$/, "")
  if (normalizedUrl.startsWith(JSDELIVR_PREFIX)) {
    return normalizedUrl.substring(JSDELIVR_PREFIX.length)
  }
  if (normalizedUrl.startsWith(TSCIRCUIT_NPM_REGISTRY)) {
    return normalizedUrl.substring(TSCIRCUIT_NPM_REGISTRY.length)
  }
  return normalizedUrl
}

function getFetchTargets(importName: string, sessionToken?: string) {
  const targets: Array<{ url: string; init?: RequestInit }> = []

  if (importName.startsWith("@tsci/")) {
    const headers: Record<string, string> = {}
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`
    }
    targets.push({
      url: `${TSCIRCUIT_NPM_REGISTRY}${importName}/+esm`,
      init: Object.keys(headers).length ? { headers } : undefined,
    })
  }

  targets.push({ url: `${JSDELIVR_PREFIX}${importName}/+esm` })

  return targets
}

export async function importNpmPackageFromCdn(
  { importName, depth = 0 }: { importName: string; depth?: number },
  ctx: ExecutionContext,
) {
  debug(`importing npm package from CDN: ${importName}`)
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return

  let finalUrl: string | undefined
  let content: string | null = null
  let lastError: any = null

  for (const target of getFetchTargets(importName, ctx.sessionToken)) {
    const result = await globalThis
      .fetch(target.url, target.init)
      .then(async (res) => {
        finalUrl = res.url
        if (!res.ok) {
          throw new Error(
            `Could not fetch "${importName}" from ${target.url}: ${res.status} ${res.statusText}\n\n${ctx.logger.stringifyLogs()}`,
          )
        }
        return { content: await res.text(), error: null }
      })
      .catch((e) => ({ error: e, content: null }))

    if (result.error) {
      lastError = result.error
      continue
    }

    content = result.content
    break
  }

  if (!content) {
    console.error("Error fetching npm import", importName, lastError)
    throw lastError
  }

  const finalImportName = finalUrl
    ? extractPackagePathFromNpmUrl(finalUrl)
    : importName
  const cwd = dirname(finalImportName)

  const importNames = getImportsFromCode(content)
  for (const subImportName of importNames) {
    if (!preSuppliedImports[subImportName]) {
      await importEvalPath(subImportName, ctx, depth + 1, {
        cwd,
      })
    }
  }

  const transformedCode = transformWithSucrase(
    content,
    finalImportName || importName,
  )
  try {
    const exports = evalCompiledJs(
      transformedCode,
      preSuppliedImports,
      cwd,
    ).exports
    preSuppliedImports[importName] = exports
    preSuppliedImports[finalImportName] = exports
    preSuppliedImports[finalUrl!] = exports
  } catch (e: any) {
    throw new Error(
      `Eval npm package error for "${importName}": ${e.message}\n\n${ctx.logger.stringifyLogs()}`,
    )
  }
}
