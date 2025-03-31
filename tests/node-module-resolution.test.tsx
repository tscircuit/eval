import { describe, expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

describe("node module resolution", () => {
  test("resolves package.json", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
        }),
        "node_modules/test-package/index.js": `
          export const resistorName = "R1"
          export const resistanceValue = "1k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(1000)
    expect(resistor.name).toBe("R1")
  })

  test("resolves package.json main field", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "dist/index.js",
        }),
        "node_modules/test-package/dist/index.js": `
          export const resistorName = "Q1"
          export const resistanceValue = "2k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "Q1",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(2000)
    expect(resistor.name).toBe("Q1")
  })

  test("resolves package.json module field over main", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          main: "dist/index.js",
          module: "dist/index.esm.js",
        }),
        "node_modules/test-package/dist/index.js": `
          exports.resistorName = "wrong-name"
          exports.resistanceValue = "wrong-value"
        `,
        "node_modules/test-package/dist/index.esm.js": `
          export const resistorName = "F2"
          export const resistanceValue = "2k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "F2",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(2000)
    expect(resistor.name).toBe("F2")
  })

  test("resolves scoped package with index file", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/@scope/package/index.js": `
          export const resistorName = "R3"
          export const resistanceValue = "3k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "@scope/package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R3",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(3000)
    expect(resistor.name).toBe("R3")
  })

  test("resolves package.json exports field with default condition", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            ".": "./dist/modern.js"
          }
        }),
        "node_modules/test-package/dist/modern.js": `
          export const resistorName = "R4"
          export const resistanceValue = "4k"
        `,
        "node_modules/test-package/index.js": `
          export const resistorName = "wrong-name"
          export const resistanceValue = "wrong-value"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )
    const resistor = circuitJson.find(
      (element) => element.type === "source_component",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(4000)
    expect(resistor.name).toBe("R4")
  })

  test("resolves package.json exports field with conditional exports", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            "import": "./dist/esm/index.js",
            "require": "./dist/cjs/index.js"
          }
        }),
        "node_modules/test-package/dist/esm/index.js": `
          export const resistorName = "R5"
          export const resistanceValue = "5k"
        `,
        "node_modules/test-package/dist/cjs/index.js": `
          exports.resistorName = "wrong-name"
          exports.resistanceValue = "wrong-value"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R5",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(5000)
    expect(resistor.name).toBe("R5")
  })

  test.skip("resolves nested node_modules packages", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/parent-package/package.json": JSON.stringify({
          name: "parent-package",
          main: "index.js"
        }),
        "node_modules/parent-package/index.js": `
          import { nestedResistorName, nestedResistanceValue } from "nested-package"
          export const resistorName = nestedResistorName
          export const resistanceValue = nestedResistanceValue
        `,
        "node_modules/parent-package/node_modules/nested-package/package.json": JSON.stringify({
          name: "nested-package",
          main: "index.js"
        }),
        "node_modules/parent-package/node_modules/nested-package/index.js": `
          export const nestedResistorName = "R7"
          export const nestedResistanceValue = "7k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "parent-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R7",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(7000)
    expect(resistor.name).toBe("R7")
  })

  test.skip("resolves file with explicit extension", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/index.js": `
          export * from "./resistor.js"
        `,
        "node_modules/test-package/resistor.js": `
          export const resistorName = "R8"
          export const resistanceValue = "8k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R8",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(8000)
    expect(resistor.name).toBe("R8")
  })

  test("resolves directory import with index.js", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/lib/index.js": `
          export const resistorName = "R9"
          export const resistanceValue = "9k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package/lib"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R9",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(9000)
    expect(resistor.name).toBe("R9")
  })

  test("resolves TypeScript files with .ts extension", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/index.ts": `
          export const resistorName: string = "R10"
          export const resistanceValue: string = "10k"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R10",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(10000)
    expect(resistor.name).toBe("R10")
  })

  test("resolves subpath exports in package.json", async () => {
    const circuitJson = await runTscircuitCode(
      {
        "node_modules/test-package/package.json": JSON.stringify({
          name: "test-package",
          exports: {
            "./components": "./dist/components/index.js",
            "./utils": "./dist/utils/index.js"
          }
        }),
        "node_modules/test-package/dist/components/index.js": `
          export const resistorName = "R11"
          export const resistanceValue = "11k"
        `,
        "node_modules/test-package/components.js": `
          export const resistorName = "wrong-name"
          export const resistanceValue = "wrong-value"
        `,
        "user-code.tsx": `
          import { resistorName, resistanceValue } from "test-package/components"
          export default () => (<resistor name={resistorName} resistance={resistanceValue} />)
        `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R11",
    ) as any
    expect(resistor).toBeDefined()
    expect(resistor.resistance).toBe(11000)
    expect(resistor.name).toBe("R11")
  })
})
