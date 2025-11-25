import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should resolve nested component imports using baseUrl from tsconfig.json", async () => {
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  await worker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `{
  "compilerOptions": {
    "baseUrl": "."
  }
}`,
      "index.tsx": `
import PowerSupply from "circuits/PowerSupply"

export default () => (
  <board width="30mm" height="30mm">
    <PowerSupply />
  </board>
)
      `,
      "circuits/PowerSupply.tsx": `
import Resistor from "components/Resistor"
import Capacitor from "components/Capacitor"

export default () => (
  <group>
    <Resistor />
    <Capacitor />
  </group>
)
      `,
      "components/Resistor.tsx": `
export default () => (
  <resistor resistance="10k" footprint="0402" name="R1" />
)
      `,
      "components/Capacitor.tsx": `
export default () => (
  <capacitor capacitance="10uF" footprint="0805" name="C1" />
)
      `,
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson.filter((el: any) => el.name === "R1")).toHaveLength(1)
  expect(circuitJson.filter((el: any) => el.name === "C1")).toHaveLength(1)

  await worker.kill()
})
