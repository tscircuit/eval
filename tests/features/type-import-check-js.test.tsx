import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

// A `.js` module that re-exports a type-only symbol from a `.ts` module. When
// user code imports that symbol as a value through the `.js` file, the eval
// engine should surface the accurate "this is a type" diagnostic rather than
// the generic "is not exported by" message.
const typesSource = `export type ZodString = { kind: "string" }
export const realValue = 5
`

const schemasJsSource = `export { ZodString, realValue } from "./types"
`

const entrySource = `import { ZodString } from "./schemas.js"

export default function ExampleBoard() {
  return (
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance={ZodString} footprint="0402" />
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

test("type export check for imports through a .js module", async () => {
  try {
    await runTscircuitCode(
      {
        "tsconfig.json": tsconfigJson,
        "types.ts": typesSource,
        "schemas.js": schemasJsSource,
        "user.tsx": entrySource,
      },
      {
        mainComponentPath: "user.tsx",
      },
    )
    throw new Error("Expected error to be thrown")
  } catch (error: any) {
    expect(error).toBeDefined()
    expect(error.message).toContain(`"ZodString" is a type`)
    expect(error.message).toContain(`Use "export type { ZodString }"`)
  }
})
