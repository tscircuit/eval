import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { cju } from "@tscircuit/circuit-json-util"
import runnerConfig from "../../tsup-runner.config"

const repoRoot = resolve(import.meta.dir, "../..")

test("build:runner emits both dist/eval and dist/runner bundles", () => {
  expect(Array.isArray(runnerConfig)).toBe(true)
  if (!Array.isArray(runnerConfig)) return

  const outputDirs = runnerConfig.map((cfg) => cfg.outDir)
  expect(outputDirs).toContain("dist/eval")
  expect(outputDirs).toContain("dist/runner")

  for (const relPath of [
    "dist/eval/index.js",
    "dist/eval/index.d.ts",
    "dist/runner/index.js",
    "dist/runner/index.d.ts",
  ]) {
    expect(existsSync(resolve(repoRoot, relPath))).toBe(true)
  }
})

test("@tscircuit/eval/runner and @tscircuit/eval/eval subpath exports resolve and run", async () => {
  const runnerSpecifier: string = "@tscircuit/eval/runner"
  const evalSpecifier: string = "@tscircuit/eval/eval"
  const runnerMod: typeof import("../../lib/runner") = await import(
    runnerSpecifier
  )
  const evalMod: typeof import("../../lib/runner") = await import(evalSpecifier)

  expect(typeof runnerMod.CircuitRunner).toBe("function")
  expect(typeof runnerMod.runTscircuitCode).toBe("function")
  expect(typeof runnerMod.runTscircuitModule).toBe("function")
  expect(typeof evalMod.CircuitRunner).toBe("function")

  const circuitJson = await runnerMod.runTscircuitCode(`
      export default () => (
        <board width="10mm" height="10mm" routingDisabled>
          <resistor name="R1" resistance="1k" />
        </board>
      )
    `)
  const resistor = cju(circuitJson)
    .source_component.list()
    .find((component) => component.name === "R1")
  expect(resistor).toBeDefined()
  expect(resistor?.ftype).toBe("simple_resistor")
}, 20_000)
