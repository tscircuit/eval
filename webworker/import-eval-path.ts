import type { ExecutionContext } from "./execution-context"
import { importLocalFile } from "./import-local-file"
import { importSnippet } from "./import-snippet"
import { resolveFilePath } from "lib/runner/resolveFilePath"
import { resolveNodeModule } from "lib/utils/resolve-node-module"
import { importNodeModule } from "./import-node-module"
import { importNpmPackage } from "./import-npm-package"
import {
  getTsConfig,
  matchesTsconfigPathPattern,
} from "lib/runner/tsconfigPaths"
import Debug from "debug"
import {
  isPackageDeclaredInPackageJson,
  getNodeModuleDirectory,
  getPackageJsonEntrypoint,
  isTypeScriptEntrypoint,
  isDistDirEmpty,
} from "./package-validation"

const debug = Debug("tsci:eval:import-eval-path")

export async function importEvalPath(
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
  opts: {
    cwd?: string
    fromJsDelivr?: boolean
  } = {},
) {
  debug("importEvalPath called with:", {
    importName,
    depth,
    opts,
  })
  ctx.logger.info(
    `importEvalPath("${importName}", {cwd: "${opts.cwd}", depth: ${depth}})`,
  )

  debug(`${"  ".repeat(depth)}➡️`, importName)
  const { preSuppliedImports } = ctx
  const disableCdnLoading =
    ctx.disableCdnLoading || (globalThis as any).__DISABLE_CDN_LOADING__

  if (preSuppliedImports[importName]) {
    ctx.logger.info(`Import "${importName}" in preSuppliedImports[1]`)
    return
  }
  if (importName.startsWith("./") && preSuppliedImports[importName.slice(2)]) {
    ctx.logger.info(`Import "${importName}" in preSuppliedImports[2]`)
    return
  }

  // Handle subpath imports from preSuppliedImports (e.g., "react/jsx-runtime")
  // If the base package is in preSuppliedImports, try to import from the actual package
  if (
    importName.includes("/") &&
    !importName.startsWith(".") &&
    !importName.startsWith("/")
  ) {
    const basePkg = importName.split("/")[0]
    const isScoped = basePkg.startsWith("@")
    const pkgName = isScoped
      ? importName.split("/").slice(0, 2).join("/")
      : basePkg
    const subpath = isScoped
      ? importName.split("/").slice(2).join("/")
      : importName.split("/").slice(1).join("/")

    if (preSuppliedImports[pkgName]) {
      try {
        // Try to import the subpath from the actual package
        const resolved = await import(`${pkgName}/${subpath}`)
        preSuppliedImports[importName] = resolved
        ctx.logger.info(
          `Import "${importName}" resolved from preSuppliedImports base package "${pkgName}"`,
        )
        return
      } catch (error) {
        // If the dynamic import fails, continue with normal resolution
        ctx.logger.info(
          `Failed to resolve "${importName}" from preSuppliedImports package "${pkgName}", falling back to normal resolution`,
        )
      }
    }
  }

  if (depth > 30) {
    throw new Error(
      `Max depth for imports reached (30) Import Path: ${ctx.importStack.join(" -> ")}`,
    )
  }

  if (importName.startsWith("/npm/")) {
    const pkgName = importName.replace(/^\/npm\//, "").replace(/\/\+esm$/, "")
    if (disableCdnLoading) {
      throw new Error(
        `Cannot find module "${pkgName}". The package is not available in the local environment.\n\n${ctx.logger.stringifyLogs()}`,
      )
    }
    ctx.logger.info(`importNpmPackage("${pkgName}")`)
    // /npm/ paths are always transitive dependencies from jsDelivr
    await importNpmPackage(
      { importName: pkgName, depth, fromJsDelivr: true },
      ctx,
    )
    const pkg = preSuppliedImports[pkgName]
    if (pkg) {
      preSuppliedImports[importName] = pkg
    }
    return
  }

  // Determine where tsconfig.json is located
  let tsconfigDir = "."
  let tsConfigToUse = ctx.tsConfig
  if (ctx.tsConfig && opts.cwd) {
    // If cwd is in node_modules, find the package root
    // e.g., "node_modules/adom-library/lib/generated" -> "node_modules/adom-library"
    const nodeModulesMatch = opts.cwd.match(/^(node_modules\/[^\/]+)/)
    if (nodeModulesMatch) {
      tsconfigDir = nodeModulesMatch[1]
      tsConfigToUse = null
    }
  }

  const resolvedLocalImportPath = resolveFilePath(
    importName,
    ctx.fsMap,
    opts.cwd,
    { tsConfig: tsConfigToUse, tsconfigDir },
  )
  if (resolvedLocalImportPath) {
    ctx.logger.info(`importLocalFile("${resolvedLocalImportPath}")`)
    await importLocalFile(resolvedLocalImportPath, ctx, depth)
    // Map the original import name (which might be a tsconfig path alias) to the resolved module
    if (importName !== resolvedLocalImportPath) {
      preSuppliedImports[importName] =
        preSuppliedImports[resolvedLocalImportPath]
    }
    return
  }

  // Check if this matches a tsconfig path pattern but failed to resolve
  // If so, throw an error instead of falling back to npm
  const tsConfig = ctx.tsConfig ?? getTsConfig(ctx.fsMap)
  if (!ctx.tsConfig && tsConfig) {
    ctx.tsConfig = tsConfig
  }
  if (matchesTsconfigPathPattern(importName, tsConfig)) {
    throw new Error(
      `Import "${importName}" matches a tsconfig path alias but could not be resolved to an existing file${opts.cwd ? ` from directory "${opts.cwd}"` : ""}\n\n${ctx.logger.stringifyLogs()}`,
    )
  }

  // Try to resolve from node_modules
  const resolvedNodeModulePath = resolveNodeModule(
    importName,
    ctx.fsMap,
    opts.cwd || "",
  )
  if (resolvedNodeModulePath) {
    ctx.logger.info(`resolvedNodeModulePath="${resolvedNodeModulePath}"`)
    ctx.logger.info(`importNodeModule("${importName}")`)
    return importNodeModule(importName, ctx, depth)
  }

  // If not found in fsMap but might be a node module, try importNodeModule
  // which will attempt to use nodeModulesResolver if configured
  if (
    !importName.startsWith(".") &&
    !importName.startsWith("/") &&
    !importName.startsWith("@tsci/")
  ) {
    const platform = ctx.circuit?.platform
    if (platform?.nodeModulesResolver) {
      ctx.logger.info(
        `importNodeModule("${importName}") via nodeModulesResolver`,
      )
      try {
        await importNodeModule(importName, ctx, depth)
        return
      } catch (error) {
        ctx.logger.info(
          `nodeModulesResolver failed for "${importName}", falling back to npm CDN`,
        )
        if (disableCdnLoading) {
          throw new Error(
            `Cannot find module "${importName}". The package is not available in the local environment and automatic npm resolution is disabled.\n\n${ctx.logger.stringifyLogs()}`,
          )
        }
      }
    }
  }

  if (importName.startsWith("@tsci/")) {
    ctx.logger.info(`importSnippet("${importName}")`)
    return importSnippet(importName, ctx, depth)
  }

  if (!importName.startsWith(".") && !importName.startsWith("/")) {
    // Validation steps for node modules (before jsDelivr fallback)
    if (!opts.fromJsDelivr) {
      // Step 1: Check if package is declared in package.json
      if (!isPackageDeclaredInPackageJson(importName, ctx.fsMap)) {
        throw new Error(
          `Node module imported but not in package.json "${importName}"\n\n${ctx.logger.stringifyLogs()}`,
        )
      }

      // Step 2: Check if node_modules directory exists (only if not found locally yet)
      // Only validate if CDN loading is disabled (i.e., no fallback to jsDelivr available)
      const nodeModuleDir = getNodeModuleDirectory(importName, ctx.fsMap)
      if (!nodeModuleDir && disableCdnLoading) {
        throw new Error(
          `Node module "${importName}" has no files in the node_modules directory\n\n${ctx.logger.stringifyLogs()}`,
        )
      }

      // Step 3: Check if main entrypoint is a TypeScript file (only if dir exists)
      if (nodeModuleDir) {
        const entrypoint = getPackageJsonEntrypoint(importName, ctx.fsMap)
        if (isTypeScriptEntrypoint(entrypoint)) {
          throw new Error(
            `Node module "${importName}" has a typescript entrypoint that is unsupported\n\n${ctx.logger.stringifyLogs()}`,
          )
        }

        // Step 4: Check if dist directory is empty when main points to dist
        if (entrypoint && entrypoint.startsWith("dist/")) {
          if (isDistDirEmpty(importName, ctx.fsMap)) {
            throw new Error(
              `Node module "${importName}" has no files in dist, did you forget to transpile?\n\n${ctx.logger.stringifyLogs()}`,
            )
          }
        }
      }
    }

    if (disableCdnLoading) {
      throw new Error(
        `Cannot find module "${importName}". The package is not available in the local environment.\n\n${ctx.logger.stringifyLogs()}`,
      )
    }
    ctx.logger.info(`importNpmPackage("${importName}")`)
    return importNpmPackage(
      { importName, depth, fromJsDelivr: opts.fromJsDelivr },
      ctx,
    )
  }

  throw new Error(
    `Unresolved import "${importName}" ${opts.cwd ? `from directory "${opts.cwd}"` : ""}\n\n${ctx.logger.stringifyLogs()}`,
  )
}
