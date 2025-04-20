import { describe, expect, test } from "bun:test"
import { runTscircuitModule } from "lib/runner"

test(
  "example14 runTscircuitModule",
  async () => {
    const circuitJson = await runTscircuitModule("seveibar/usb-c-flashlight")

    expect(circuitJson).toBeDefined()

    const sourceComponent = circuitJson.find(
      (element) => element.type === "source_component",
    )

    expect(sourceComponent).toBeDefined()
  },
  { timeout: 15000 }, // Increased timeout for potential network request
)
