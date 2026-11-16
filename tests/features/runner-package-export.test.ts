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

  const runnerExport = await import("@tscircuit/eval/runner")
  const evalExport = await import("@tscircuit/eval/eval")

  expect(typeof runnerExport.CircuitRunner).toBe("function")
  expect(typeof runnerExport.runTscircuitCode).toBe("function")
  expect(runnerExport.CircuitRunner).toBe(evalExport.CircuitRunner)
  expect(runnerExport.runTscircuitCode).toBe(evalExport.runTscircuitCode)
})
