import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

// tsci dev uploads node_modules/tscircuit/package.json so the evaluator knows
// which packages come with tscircuit, e.g. @tscircuit/ngspice-spice-engine
const getFsMap = (circuitCode: string) => ({
  "package.json": JSON.stringify({
    name: "test",
    devDependencies: { tscircuit: "*" },
  }),
  "node_modules/tscircuit/package.json": JSON.stringify({
    name: "tscircuit",
    dependencies: { "provided-by-tscircuit": "^1.0.0" },
    devDependencies: { "tscircuit-dev-only": "^1.0.0" },
  }),
  "node_modules/provided-by-tscircuit/package.json": JSON.stringify({
    name: "provided-by-tscircuit",
    main: "index.js",
  }),
  "node_modules/provided-by-tscircuit/index.js": "export const value = 'ok'",
  "node_modules/tscircuit-dev-only/package.json": JSON.stringify({
    name: "tscircuit-dev-only",
    main: "index.js",
  }),
  "node_modules/tscircuit-dev-only/index.js": "export const value = 'ok'",
  "index.tsx": circuitCode,
})

test("a dependency of tscircuit can be imported without declaring it", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    mainComponentPath: "index.tsx",
    fsMap: getFsMap(`
      import { value } from "provided-by-tscircuit"
      globalThis.__providedByTscircuit = value
      export default () => <board width="10mm" height="10mm" />
    `),
  })
  await runner.renderUntilSettled()
  await runner.kill()

  expect((globalThis as any).__providedByTscircuit).toBe("ok")
})

test("a devDependency of tscircuit still has to be declared", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      mainComponentPath: "index.tsx",
      fsMap: getFsMap(`
        import { value } from "tscircuit-dev-only"
        export default () => <board width="10mm" height="10mm" />
      `),
    }),
  ).rejects.toThrow(
    /Node module imported but not in package\.json "tscircuit-dev-only"/,
  )
})
