import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("nodeModulesResolver: should resolve modules not in fsMap", async () => {
  const runner = new CircuitRunner()

  // Create a custom resolver that returns a mock module
  const fakeResolver = async (modulePath: string) => {
    if (modulePath === "test-package") {
      return `
        export const testValue = "resolved from custom resolver"
        export default { message: "hello from resolver" }
      `
    }
    throw new Error("Package not found")
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  await runner.execute(`
    import { testValue } from "test-package"

    circuit.add(<board width="10mm" height="10mm" />)
  `)

  await runner.renderUntilSettled()

  // If we get here without errors, the resolver worked
  expect(
    runner._executionContext?.preSuppliedImports["test-package"],
  ).toBeDefined()
})

test("nodeModulesResolver: should handle scoped packages", async () => {
  const runner = new CircuitRunner()

  const fakeResolver = async (modulePath: string) => {
    if (modulePath === "@test/scoped-package") {
      return `export const scopedValue = "from scoped package"`
    }
    throw new Error("Package not found")
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  await runner.execute(`
    import { scopedValue } from "@test/scoped-package"

    circuit.add(<board width="10mm" height="10mm" />)
  `)

  await runner.renderUntilSettled()

  expect(
    runner._executionContext?.preSuppliedImports["@test/scoped-package"],
  ).toBeDefined()
})

test("nodeModulesResolver: should handle subpath imports", async () => {
  const runner = new CircuitRunner()

  const fakeResolver = async (modulePath: string) => {
    if (modulePath === "@test/package/submodule") {
      return `export const subValue = "from submodule"`
    }
    throw new Error("Package not found")
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  await runner.execute(`
    import { subValue } from "@test/package/submodule"

    circuit.add(<board width="10mm" height="10mm" />)
  `)

  await runner.renderUntilSettled()

  expect(
    runner._executionContext?.preSuppliedImports["@test/package/submodule"],
  ).toBeDefined()
})

test("nodeModulesResolver: should handle nested subpaths", async () => {
  const runner = new CircuitRunner()

  const fakeResolver = async (modulePath: string) => {
    if (modulePath === "regular-package/dist/index") {
      return `export const nestedValue = "from nested path"`
    }
    throw new Error("Package not found")
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  await runner.execute(`
    import { nestedValue } from "regular-package/dist/index"

    circuit.add(<board width="10mm" height="10mm" />)
  `)

  await runner.renderUntilSettled()

  expect(
    runner._executionContext?.preSuppliedImports["regular-package/dist/index"],
  ).toBeDefined()
})

test("nodeModulesResolver: should fallback to npm CDN when resolver throws", async () => {
  const runner = new CircuitRunner()

  const fakeResolver = async () => {
    throw new Error("Package not found") // Always throw
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  // Since the resolver throws, it should fall back to npm CDN
  // Missing packages will fail with jsdelivr error
  await expect(async () => {
    await runner.execute(`
      import { missing } from "missing-package"

      circuit.add(<board width="10mm" height="10mm" />)
    `)
  }).toThrow() // Will throw jsdelivr error
})

test("nodeModulesResolver: should prefer fsMap over resolver", async () => {
  const runner = new CircuitRunner()

  let resolverCalled = false
  const fakeResolver = async () => {
    resolverCalled = true
    return `export const value = "from resolver"`
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: fakeResolver,
  }

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { value } from "my-package"
        circuit.add(<board width="10mm" height="10mm" />)
      `,
      "node_modules/my-package/index.js": `export const value = "from fsMap"`,
      "node_modules/my-package/package.json": JSON.stringify({
        main: "index.js",
      }),
    },
  })

  await runner.renderUntilSettled()

  // Resolver should NOT have been called since the package exists in fsMap
  expect(resolverCalled).toBe(false)
  expect(
    runner._executionContext?.preSuppliedImports["my-package"],
  ).toBeDefined()
})

test("nodeModulesResolver: should work with CDN-style resolver", async () => {
  const runner = new CircuitRunner()

  // Simulate a CDN resolver
  const cdnResolver = async (modulePath: string) => {
    // Simulate fetching from a CDN
    if (modulePath === "lodash") {
      return `
        export function get(obj, path) {
          return "mocked lodash get"
        }
      `
    }
    throw new Error("Package not found")
  }

  runner._circuitRunnerConfiguration.platform = {
    nodeModulesResolver: cdnResolver,
  }

  await runner.execute(`
    import { get } from "lodash"

    circuit.add(<board width="10mm" height="10mm" />)
  `)

  await runner.renderUntilSettled()

  expect(runner._executionContext?.preSuppliedImports.lodash).toBeDefined()
})
