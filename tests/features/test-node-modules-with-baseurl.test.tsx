import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should allow npm imports from within node_modules even when project has baseUrl", async () => {
  // This simulates the scenario where:
  // 1. Project has tsconfig with baseUrl
  // 2. A node_module package's transpiled code imports "react/jsx-runtime"
  // 3. The import should resolve to npm, not try to use project's baseUrl

  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: "src",
        },
      }),
      "node_modules/test-package/index.js": `
        // Simulating transpiled JSX that imports react/jsx-runtime
        import { jsx as _jsx } from "react/jsx-runtime";
        export default () => _jsx("resistor", { name: "R1", resistance: "1k" });
      `,
      "user.tsx": `
        import TestComponent from "node_modules/test-package/index.js"
        export default TestComponent
      `,
    },
    {
      mainComponentPath: "user",
    },
  )

  const resistor = circuitJson.find(
    (el) => el.type === "source_component" && el.name === "R1",
  ) as any

  expect(resistor).toBeDefined()
  expect(resistor.resistance).toBe(1000)
})
