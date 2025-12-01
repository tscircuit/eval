/**
 * Evaluation utilities for running tscircuit code
 * Used by both lib/runner/CircuitRunner and webworker/entrypoint
 */
export {
  createExecutionContext,
  type ExecutionContext,
} from "./execution-context"
export { importEvalPath } from "./import-eval-path"
export { importLocalFile } from "./import-local-file"
export { importSnippet } from "./import-snippet"
export { importNodeModule } from "./import-node-module"
export { importNpmPackage } from "./import-npm-package"
export { evalCompiledJs } from "./eval-compiled-js"
export { transformWithSucrase } from "lib/transpile/transform-with-sucrase"
export { extractBasePackageName } from "./extractBasePackageName"
export { isPackageDeclaredInPackageJson } from "./isPackageDeclaredInPackageJson"
export { getNodeModuleDirectory } from "./getNodeModuleDirectory"
export { getPackageJsonEntrypoint } from "./getPackageJsonEntrypoint"
export { isTypeScriptEntrypoint } from "./isTypeScriptEntrypoint"
export { isDistDirEmpty } from "./isDistDirEmpty"
