import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

test("should resolve imports using baseUrl set to src directory from tsconfig.json", async () => {
  // Note: baseUrl should be specified without leading "./" (e.g., "src" not "./src")
  const circuitWebWorker = createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  const worker = await circuitWebWorker
  await worker.executeWithFsMap({
    fsMap: {
      "tsconfig.json": `{
  "compilerOptions": {
    "baseUrl": "src"
  }
}`,
      "index.tsx": `
import MyLed from "components/MyLed"
import MyResistor from "components/MyResistor"

export default () => (
  <board width="20mm" height="20mm">
    <MyLed />
    <MyResistor />
  </board>
)
      `,
      "src/components/MyLed.tsx": `
export default () => (
  <led name="LED1" footprint="0805" />
)
      `,
      "src/components/MyResistor.tsx": `
export default () => (
  <resistor resistance="10k" footprint="0402" name="R1" />
)
      `,
    },
    mainComponentPath: "index.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  expect(circuitJson.filter((el: any) => el.name === "LED1")).toHaveLength(1)
  expect(circuitJson.filter((el: any) => el.name === "R1")).toHaveLength(1)

  await worker.kill()
})
