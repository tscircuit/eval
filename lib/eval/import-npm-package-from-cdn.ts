import Debug from "debug"
import { transformWithSucrase } from "lib/transpile/transform-with-sucrase"
import { dirname } from "lib/utils/dirname"
import { enhanceStaticAssetSentinelError } from "lib/utils/enhance-static-asset-error"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { getJscdnPackageUrl } from "lib/utils/npm-cdn-urls"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"

const debug = Debug("tsci:eval:import-npm-package")

function extractPackagePathFromCdnUrl(url: string, importName: string) {
  if (url.startsWith("https://cdn.jsdelivr.net/npm/")) {
    return url
      .substring("https://cdn.jsdelivr.net/npm/".length)
      .replace(/\/\+esm$/, "")
  }

  if (url.startsWith("https://jscdn.tscircuit.com/")) return importName

  return url
}

export async function importNpmPackageFromCdn(
  { importName, depth = 0 }: { importName: string; depth?: number },
  ctx: ExecutionContext,
) {
  debug(`importing npm package from CDN: ${importName}`)
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return

  const npmCdnUrls = [
    `${getJscdnPackageUrl(importName)}/+esm`,
    `https://cdn.jsdelivr.net/npm/${importName}/+esm`,
  ]
  let lastCdnError: unknown

  for (const npmCdnUrl of npmCdnUrls) {
    try {
      const response = await globalThis.fetch(npmCdnUrl)
      if (!response.ok) {
        throw new Error(
          `Could not fetch "${importName}" from ${npmCdnUrl}: ${response.statusText}\n\n${ctx.logger.stringifyLogs()}`,
        )
      }
      const content = await response.text()
      const finalImportName = extractPackagePathFromCdnUrl(
        response.url,
        importName,
      )
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
      const exports = evalCompiledJs(
        transformedCode,
        preSuppliedImports,
        cwd,
      ).exports

      preSuppliedImports[importName] = exports
      preSuppliedImports[finalImportName] = exports
      preSuppliedImports[response.url] = exports
      return
    } catch (error) {
      lastCdnError = enhanceStaticAssetSentinelError(error, {
        importName,
      })
    }
  }

  if (lastCdnError instanceof Error) {
    throw new Error(
      `Eval npm package error for "${importName}": ${lastCdnError.message}\n\n${ctx.logger.stringifyLogs()}`,
    )
  }

  throw new Error(
    `Eval npm package error for "${importName}"\n\n${ctx.logger.stringifyLogs()}`,
  )
}
