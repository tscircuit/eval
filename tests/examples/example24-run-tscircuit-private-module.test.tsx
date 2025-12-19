import { describe, expect, test } from "bun:test"
import { runTscircuitModule } from "lib/runner"

// NEEDS SESSION TOKEN TO BE SET IN THE ENVIRONMENT
test.skip(
  "example24 runTscircuitModule private module",
  async () => {
    const tscircuitSessionToken = process.env.TSCIRCUIT_SESSION_TOKEN
    const privateModule = "@tsci/imrishabh18.test-private"

    const circuitJson = await runTscircuitModule(privateModule, {
      tscircuitSessionToken,
    })

    expect(circuitJson).toBeDefined()

    const sourceComponent = circuitJson.find(
      (element) => element.type === "source_component",
    )

    expect(sourceComponent).toBeDefined()
  },
  { timeout: 15000 }, // Increased timeout for potential network request
)
