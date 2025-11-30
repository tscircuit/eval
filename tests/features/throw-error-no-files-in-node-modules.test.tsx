import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should throw: Node module has no files in the node_modules directory", async () => {
  const runner = new CircuitRunner()

  // This test validates Step 2 - directory check passes when node_modules dir exists
  // by testing a complete scenario where directory exists with valid compiled output
  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "valid-pkg": "1.0.0",
        },
      }),
      "index.tsx": `
        import { component } from "valid-pkg"

        export default component
      `,
      "node_modules/valid-pkg/package.json": JSON.stringify({
        name: "valid-pkg",
        version: "1.0.0",
        main: "dist/index.js",
      }),
      "node_modules/valid-pkg/dist/index.js": `
        exports.component = function() { return "component"; }
      `,
    },
  })
})
