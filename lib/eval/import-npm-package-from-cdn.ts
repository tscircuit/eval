import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { dirname } from "lib/utils/dirname"
import Debug from "debug"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"
import { transformWithSucrase } from "lib/transpile/transform-with-sucrase"
import { getJscdnPackageUrl } from "lib/utils/npm-cdn-urls"
import { hasPreSuppliedImport } from "./pre-supplied-imports"

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

  if (hasPreSuppliedImport(preSuppliedImports, importName)) return

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
        // A key that is present but undefined is a placeholder left behind by a
        // partially-completed load, not a fully-evaluated module. Treat it as
        // not-yet-loaded so the dependency is actually resolved before we run
        // this package's compiled code against it.
        const isRegistered = hasPreSuppliedImport(
          preSuppliedImports,
          subImportName,
        )
        const isFullyLoaded =
          isRegistered && preSuppliedImports[subImportName] !== undefined
        if (!isFullyLoaded) {
          // Drop the undefined placeholder so downstream resolution
          // (importEvalPath) doesn't short-circuit on the existing key and
          // actually loads the dependency.
          if (isRegistered) {
            delete preSuppliedImports[subImportName]
          }
          await importEvalPath(subImportName, ctx, depth + 1, {
            cwd,
          })
        }
      }

      // Every transitive dependency must be fully evaluated and registered
      // before this package's compiled code runs. If one still resolves to
      // undefined, evaluating the body would throw a cryptic
      // "Cannot read properties of undefined" at an arbitrary property access
      // (e.g. a legacy @tscircuit/soup chain reading `zod.string`). Fail here
      // with an actionable message instead.
      for (const subImportName of importNames) {
        if (
          hasPreSuppliedImport(preSuppliedImports, subImportName) &&
          preSuppliedImports[subImportName] === undefined
        ) {
          throw new Error(
            `Transitive dependency "${subImportName}" required by "${finalImportName || importName}" resolved to undefined and could not be loaded before evaluation`,
          )
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
      lastCdnError = error
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
