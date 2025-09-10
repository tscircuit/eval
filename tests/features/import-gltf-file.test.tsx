import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should support importing .gltf files with binary", async () => {
  const runner = new CircuitRunner()

  const gltfContent = {
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 0 } }],
      },
    ],
    buffers: [{ uri: "model.bin", byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: 3,
        type: "VEC3",
      },
    ],
  }

  const binContent = "This is a dummy binary file content.".padEnd(36, "\0")

  const fsMap = {
    "my-model.gltf": JSON.stringify(gltfContent),
    "model.bin": binContent,
    "user-code.tsx": `
        import myGltfUrl from "./my-model.gltf"

        export default () => (
            <chip
                name="C1"
                cadModel={{
                    gltfUrl: myGltfUrl,
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
    const text = await response.text()
    const json = JSON.parse(text)
    expect(json.buffers[0].uri).toStartWith(
      "data:application/octet-stream;base64,",
    )
  }

  await runner.kill()
})
