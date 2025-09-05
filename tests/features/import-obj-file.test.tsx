import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  AnySourceComponent,
  CadComponent,
} from "circuit-json"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("should support importing .obj files", async () => {
  const runner = new CircuitRunner()

  const fsMap = {
    "my-model.obj": `v 1.0 1.0 0.0`, // some dummy obj content
    "user-code.tsx": `
        import myObjUrl from "./my-model.obj"

        export default () => (
            <chip
                name="C1"
                cadModel={{
                    objUrl: myObjUrl,
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
  expect(cadModel?.model_obj_url).toBeString()
  expect(cadModel?.model_obj_url).toStartWith("blob:")

  await runner.kill()
})
