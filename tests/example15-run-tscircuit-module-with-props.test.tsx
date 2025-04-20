import { describe, expect, test } from "bun:test"
import { runTscircuitModule } from "lib/runner"

test(
  "example15 runTscircuitModule with props",
  async () => {
    const circuitJson = await runTscircuitModule("@tsci/seveibar.key", {
      props: {
        name: "MyKey",
      },
    })

    expect(circuitJson).toBeDefined()

    const sourceComponent = circuitJson.find(
      (element) => element.type === "source_component",
    )

    expect(sourceComponent?.name).toBe("MyKey")

    expect(sourceComponent).toBeDefined()
  },
  { timeout: 15000 }, // Increased timeout for potential network request
)
