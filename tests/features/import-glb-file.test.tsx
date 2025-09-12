import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should support importing .glb files", async () => {
  const runner = new CircuitRunner()

  const glbContent = "This is a dummy glb file"

  const fsMap = {
    "my-model.glb": glbContent,
    "user-code.tsx": `
        import myGlbUrl from "./my-model.glb"

        export default () => (
            <chip
                name="C1"
                cadModel={{
                    gltfUrl: myGlbUrl,
                }}
            />
        )
    `,
  }

  await runner.executeWithFsMap({
    fsMap,
    mainComponentPath: "user-code.tsx",
  })

  await runner.renderUntilSettled()
  const circuitJson = await runner.getCircuitJson()

  const chip =
    (circuitJson.find(
      (elm) => elm.type === "source_component" && elm.name === "C1",
    ) as AnyCircuitElement) || undefined
  const cadModel =
    (circuitJson.find((elm) => elm.type === "cad_component") as CadComponent) ||
    undefined

  expect(chip).toBeDefined()
  expect(cadModel?.model_gltf_url).toBeString()
  expect(cadModel?.model_gltf_url).toStartWith("blob:")

  if (cadModel?.model_gltf_url) {
    const response = await fetch(cadModel.model_gltf_url)
    const arrayBuffer = await response.arrayBuffer()
    const text = new TextDecoder().decode(arrayBuffer)
    expect(text).toBe(glbContent)
  }

  await runner.kill()
})
