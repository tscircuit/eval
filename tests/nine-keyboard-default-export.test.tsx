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

    const keyboard = circuitJson.find((element) => element.type === "pcb_via")

    expect(keyboard).toBeDefined()
  },
  { timeout: 10000 },
)
