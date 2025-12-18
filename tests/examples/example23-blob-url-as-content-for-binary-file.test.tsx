import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test } from "bun:test"
import { expect } from "bun:test"
import type { CadComponent } from "circuit-json"

test(
  "example23-blob-url-as-content-for-binary-file",
  async () => {
    const runner = new CircuitRunner({
      platform: {
        ...getPlatformConfig(),
      },
    })

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
import testGlb from "./test.glb"
circuit.add(
  <board width="10mm" height="10mm">
    <resistor
      name="R1"
      resistance={1000}
      footprint="0402"
      cadModel={
        <cadmodel
          modelUrl={testGlb}
          pcbX={1}
        />
      }
    />
  </board>
)
`,
        "test.glb": "blob:https://localhost:3000/1234567890",
      },
    })

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()
    expect(circuitJson).toBeDefined()

    const cadModel = circuitJson.find(
      (el: any) => el.type === "cad_component",
    ) as CadComponent
    expect(cadModel).toBeDefined()
    expect(cadModel?.type).toBe("cad_component")
    expect(cadModel?.model_glb_url).toBe(
      "blob:https://localhost:3000/1234567890",
    )

    await runner.kill()
  },
  20 * 1000,
)
