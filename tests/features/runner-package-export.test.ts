import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dir, "../..")

test("package.json exports map ./runner and all declared targets to built files", async () => {
  const pkg = JSON.parse(
    readFileSync(resolve(repoRoot, "package.json"), "utf8"),
  ) as {
    exports: Record<string, { types?: string; import?: string }>
  }

  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (target.import) {
      expect(
        existsSync(resolve(repoRoot, target.import)),
        `Missing import target for export "${subpath}": ${target.import}`,
      ).toBe(true)
    }
    if (target.types) {
      expect(
        existsSync(resolve(repoRoot, target.types)),
        `Missing types target for export "${subpath}": ${target.types}`,
      ).toBe(true)
    }
  }

  type RunnerModule = typeof import("../../lib/runner")
  const runnerExportName: string = "@tscircuit/eval/runner"
  const evalExportName: string = "@tscircuit/eval/eval"
  const runnerExport = (await import(runnerExportName)) as RunnerModule
  const evalExport = (await import(evalExportName)) as RunnerModule

  expect(typeof runnerExport.CircuitRunner).toBe("function")
  expect(typeof runnerExport.runTscircuitCode).toBe("function")
  expect(runnerExport.CircuitRunner).toBe(evalExport.CircuitRunner)
  expect(runnerExport.runTscircuitCode).toBe(evalExport.runTscircuitCode)
})
