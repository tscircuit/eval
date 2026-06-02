import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should import node module with typescript entrypoint", async () => {
  const runner = new CircuitRunner()

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "ts-package": "1.0.0",
        },
      }),
      "index.tsx": `
        import { MyPackageComponent } from "ts-package"

        circuit.add(<MyPackageComponent />)
      `,
      "node_modules/ts-package/package.json": JSON.stringify({
        name: "ts-package",
        version: "1.0.0",
        main: "src/index.ts",
      }),
      "node_modules/ts-package/src/index.ts": `
        export const MyPackageComponent = () => (
          <resistor name="R1" resistance="1k" />
        )
      `,
    },
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()

  expect(
    circuitJson.some(
      (element: any) =>
        element.type === "source_component" && element.name === "R1",
    ),
  ).toBe(true)
})
