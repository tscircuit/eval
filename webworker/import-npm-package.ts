import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { dirname } from "lib/utils/dirname"
import Debug from "debug"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { importEvalPath } from "./import-eval-path"
import { transformWithSucrase } from "./transform-with-sucrase"

const debug = Debug("tsci:eval:import-npm-package")

function isPackageDeclaredInPackageJson(
  packageName: string,
  fsMap: Record<string, string>,
): boolean {
  const packageJsonContent = fsMap["package.json"]
  if (!packageJsonContent) {
    // No package.json means we can't validate - allow the import
    return true
  }

  try {
    const packageJson = JSON.parse(packageJsonContent)
    const dependencies = packageJson.dependencies || {}
    const devDependencies = packageJson.devDependencies || {}
    const peerDependencies = packageJson.peerDependencies || {}

    // Extract the base package name (handle scoped packages and subpaths)
    // e.g., "@scope/package/subpath" -> "@scope/package"
    // e.g., "lodash/get" -> "lodash"
    let basePackageName = packageName
    if (packageName.startsWith("@")) {
      // Scoped package: @scope/package or @scope/package/subpath
      const parts = packageName.split("/")
      basePackageName =
        parts.length >= 2 ? `${parts[0]}/${parts[1]}` : packageName
    } else {
      // Regular package: package or package/subpath
      basePackageName = packageName.split("/")[0]
    }

    return (
      basePackageName in dependencies ||
      basePackageName in devDependencies ||
      basePackageName in peerDependencies
    )
  } catch {
    // If we can't parse package.json, allow the import
    return true
  }
}

function extractPackagePathFromJSDelivr(url: string) {
  const prefix = "https://cdn.jsdelivr.net/npm/"
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length).replace(/\/\+esm$/, "")
  }
  return url
}

export async function importNpmPackage(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
  fromJsDelivr = false,
) {
  debug(`importing npm package: ${importName}`)
  const { preSuppliedImports, fsMap } = ctx

  if (preSuppliedImports[importName]) return

  // Check if the package is declared in package.json before fetching from jsDelivr
  // Skip this check for transitive dependencies (sub-imports from jsDelivr packages)
  if (!fromJsDelivr && !isPackageDeclaredInPackageJson(importName, fsMap)) {
    throw new Error(
      `Package "${importName}" is not declared in package.json. ` +
        `Add it to dependencies or devDependencies before importing.\n\n${ctx.logger.stringifyLogs()}`,
    )
  }

  const npmCdnUrl = `https://cdn.jsdelivr.net/npm/${importName}/+esm`

  let finalUrl: string | undefined
  const { content, error } = await globalThis
    .fetch(npmCdnUrl)
    .then(async (res) => {
      finalUrl = res.url
      if (!res.ok)
        throw new Error(
          `Could not fetch "${importName}" from jsdelivr: ${res.statusText}\n\n${ctx.logger.stringifyLogs()}`,
        )
      return { content: await res.text(), error: null }
    })
    .catch((e) => ({ error: e, content: null }))

  if (error) {
    console.error("Error fetching npm import", importName, error)
    throw error
  }

  const finalImportName = extractPackagePathFromJSDelivr(finalUrl!)
  const cwd = dirname(finalImportName)

  const importNames = getImportsFromCode(content!)
  for (const subImportName of importNames) {
    if (!preSuppliedImports[subImportName]) {
      await importEvalPath(subImportName, ctx, depth + 1, {
        cwd,
        fromJsDelivr: true,
      })
    }
  }

  const transformedCode = transformWithSucrase(
    content!,
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
