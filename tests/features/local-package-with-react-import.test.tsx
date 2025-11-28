import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should resolve react imports from local transpiled packages", async () => {
  const runner = new CircuitRunner()

  await runner.setDisableCdnLoading(true)

  // Simulate a transpiled local package that imports react/jsx-runtime
  // The key test here is that the import resolves without throwing "Cannot find module"
  const transpiledPackageCode = `
    import { jsx as _jsx } from "react/jsx-runtime";
    export const MyLocalComponent = () => {
      return _jsx("resistor", { name: "R1", resistance: "1k" });
    };
  `

  await runner.executeWithFsMap({
    fsMap: {
      "index.tsx": `
        import { MyLocalComponent } from "my-library"
        export default () => <MyLocalComponent />
      `,
      "node_modules/my-library/dist/index.js": transpiledPackageCode,
      "node_modules/my-library/package.json": JSON.stringify({
        name: "my-library",
        main: "dist/index.js",
      }),
      // Don't need to provide React - it should be available from the execution context
    },
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()

  const resistor = circuitJson.find(
    (element: any) =>
      element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
})
