import { runTscircuitCode } from "lib/runner"
import { test, expect } from "bun:test"

test(
  "NineKeyKeyboard default export resolves and renders correctly",
  async () => {
    const circuitJson = await runTscircuitCode(
      {
        "user-code.tsx": `
        import NineKeyKeyboard from "@tsci/seveibar.nine-key-keyboard"
export default () => <NineKeyKeyboard />
      `,
      },
      {
        mainComponentPath: "user-code",
      },
    )

    const someSourceElm = circuitJson.find(
      (element) => element.type === "source_component",
    )

    expect(someSourceElm).toBeDefined()
  },
  // Increased timeout to 450 seconds as capacity-autorouter running out of iterations
  { timeout: 450_000 },
)
