import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"
const globalsSource = `export type ExampleType = "foo" | "bar"
export const exampleValue = 1
`

const entrySource = `export { ExampleType } from "./lib/src/globals"

export default function ExampleBoard() {
  return (
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>
  )
}
`

const tsconfigJson = JSON.stringify(
  {
    compilerOptions: {
      jsx: "react-jsx",
      module: "ESNext",
      target: "ES2017",
      moduleResolution: "node",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: true,
      baseUrl: ".",
    },
  },
  null,
  2,
)

test("type export check", async () => {
  try {
    await runTscircuitCode(
      {
        "tsconfig.json": tsconfigJson,
        "lib/src/globals.ts": globalsSource,
        "user.tsx": entrySource,
      },
      {
        mainComponentPath: "user.tsx",
      },
    )
    throw new Error("Expected error to be thrown")
  } catch (error: any) {
    expect(error).toBeDefined()
    expect(error.message).toContain(`"ExampleType" is a type exported by`)
    expect(error.message).toContain(
      `Use "export type { ExampleType }" instead of "export { ExampleType }"`,
    )
  }
})
