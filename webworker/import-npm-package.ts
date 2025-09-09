import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import * as Babel from "@babel/standalone"
import { dirname } from "lib/utils/dirname"
import Debug from "debug"

const debug = Debug("tsci:eval:import-npm-package")

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
) {
  debug(`importing npm package: ${importName}`)
  const { preSuppliedImports } = ctx

  if (preSuppliedImports[importName]) return

  const npmCdnUrl = `https://cdn.jsdelivr.net/npm/${importName}/+esm`

  let finalUrl: string | undefined
  const { content, error } = await globalThis
    .fetch(npmCdnUrl)
    .then(async (res) => {
      finalUrl = res.url
      if (!res.ok)
        throw new Error(
          `Could not fetch "${importName}" from jsdelivr: ${res.statusText}`,
        )
      return { content: await res.text(), error: null }
    })
    .catch((e) => ({ error: e, content: null }))

  if (error) {
    console.error("Error fetching npm import", importName, error)
    throw error
  }

  const transpiled = Babel.transform(content!, {
    presets: ["react", "env"],
    plugins: ["transform-modules-commonjs"],
    filename: importName,
  })

  if (!transpiled.code) {
    throw new Error(`Babel transpilation failed for ${importName}`)
  }
  try {
    const finalImportName = extractPackagePathFromJSDelivr(finalUrl!)
    const cwd = dirname(finalImportName)
    const exports = evalCompiledJs(
      transpiled.code!,
      preSuppliedImports,
      cwd,
    ).exports
    preSuppliedImports[importName] = exports
    preSuppliedImports[finalImportName] = exports
    preSuppliedImports[finalUrl!] = exports
  } catch (e: any) {
    throw new Error(`Eval npm package error for "${importName}": ${e.message}`)
  }
}
