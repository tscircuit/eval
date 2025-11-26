import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("throws when module not listed in package.json", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-lib"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: {},
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module imported but not in package.json 'missing-lib'",
  )
})

test("throws when dependency is declared but node_modules has no files", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "empty-install"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "empty-install": "1.0.0" },
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module 'empty-install' has no files in the node_modules directory",
  )
})

test("throws when dependency entrypoint is typescript", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "ts-entry"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "ts-entry": "1.0.0" },
        }),
        "node_modules/ts-entry/package.json": JSON.stringify({
          name: "ts-entry",
          main: "index.ts",
        }),
        "node_modules/ts-entry/index.ts": `export const value = 1`,
      },
    }),
  ).rejects.toThrow(
    "Node module 'ts-entry' has a typescript entrypoint that is unsupported",
  )
})

test("throws when dist directory is empty", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "no-dist"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "no-dist": "1.0.0" },
        }),
        "node_modules/no-dist/package.json": JSON.stringify({
          name: "no-dist",
          main: "dist/index.js",
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module 'no-dist' has no files in dist, did you forget to transpile?",
  )
})

test("throws when package.json is missing but module is imported", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-lib"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        // Note: No package.json file - edge case for missing/unparseable package.json
      },
    }),
  ).rejects.toThrow(
    "Node module imported but not in package.json 'missing-lib'",
  )
})

test("throws when module directory exists but has no package.json", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "broken-module"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "broken-module": "1.0.0" },
        }),
        // Module directory exists but package.json is missing
        "node_modules/broken-module/index.js": `export const value = 1`,
      },
    }),
  ).rejects.toThrow(
    "Node module 'broken-module' has a directory in node_modules but no package.json",
  )
})

test("throws when module has no main/module field in package.json", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "no-entry-module"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "no-entry-module": "1.0.0" },
        }),
        "node_modules/no-entry-module/package.json": JSON.stringify({
          name: "no-entry-module",
          // Missing: main, module, exports fields
        }),
        "node_modules/no-entry-module/index.js": `export const value = 1`,
      },
    }),
  ).rejects.toThrow(
    "Node module 'no-entry-module' has no 'main', 'module', or 'exports' field in package.json",
  )
})

test("throws when module main points to non-existent file", async () => {
  const runner = new CircuitRunner()

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `import pkg from "missing-entry-module"
          circuit.add(<board width="1mm" height="1mm" />)
        `,
        "package.json": JSON.stringify({
          name: "test",
          dependencies: { "missing-entry-module": "1.0.0" },
        }),
        "node_modules/missing-entry-module/package.json": JSON.stringify({
          name: "missing-entry-module",
          main: "lib/index.js",
          // Note: lib/index.js doesn't actually exist in fsMap
        }),
      },
    }),
  ).rejects.toThrow(
    "Node module 'missing-entry-module' has no entry point at 'lib/index.js'",
  )
})
