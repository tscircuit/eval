import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

// Mirrors the recurring eval-sandbox failure class where a package loads fine
// but one of its own transitive dependencies is missing from the sandbox
// node_modules (e.g. "nth-check" via "css-select", "iobuffer" via
// "@tscircuit/image-utils").
test("names the importing package when a transitive dependency is missing", async () => {
  const runner = new CircuitRunner()
  await runner.setDisableCdnLoading(true)

  await expect(
    runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "css-select": "5.1.0",
          },
        }),
        "index.tsx": `
          import { selectAll } from "css-select"
          export default selectAll
        `,
        // css-select is present and declares nth-check as its own dependency...
        "node_modules/css-select/package.json": JSON.stringify({
          name: "css-select",
          version: "5.1.0",
          main: "lib/index.js",
          dependencies: {
            "nth-check": "2.1.1",
          },
        }),
        "node_modules/css-select/lib/index.js": `
          const { filters } = require("./pseudo-selectors/filters")
          exports.selectAll = filters
        `,
        // ...but nth-check itself is never supplied in node_modules.
        "node_modules/css-select/lib/pseudo-selectors/filters.js": `
          const nthCheck = require("nth-check")
          exports.filters = nthCheck
        `,
      },
    }),
  ).rejects.toThrow(/"nth-check" is a transitive dependency of "css-select"/)
})

// The undeclared-transitive-dep check must consult the importing package's own
// package.json (not just the root project's), so it does not falsely claim a
// declared transitive dependency is missing from package.json.
test("does not falsely report a declared transitive dependency as undeclared", async () => {
  const runner = new CircuitRunner()
  await runner.setDisableCdnLoading(true)

  let threw: Error | null = null
  try {
    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "css-select": "5.1.0",
          },
        }),
        "index.tsx": `
          import { selectAll } from "css-select"
          export default selectAll
        `,
        "node_modules/css-select/package.json": JSON.stringify({
          name: "css-select",
          version: "5.1.0",
          main: "lib/index.js",
          dependencies: {
            "nth-check": "2.1.1",
          },
        }),
        "node_modules/css-select/lib/index.js": `
          const { filters } = require("./pseudo-selectors/filters")
          exports.selectAll = filters
        `,
        "node_modules/css-select/lib/pseudo-selectors/filters.js": `
          const nthCheck = require("nth-check")
          exports.filters = nthCheck
        `,
      },
    })
  } catch (error) {
    threw = error as Error
  }

  // nth-check is genuinely missing, so it should still throw, but the message
  // must NOT wrongly claim it is absent from package.json (it is declared in
  // css-select's own package.json).
  expect(threw).not.toBeNull()
  expect(threw!.message).not.toMatch(
    /Node module imported but not in package\.json "nth-check"/,
  )
})
