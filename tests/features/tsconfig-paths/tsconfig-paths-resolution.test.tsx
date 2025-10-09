import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

const TS_CONFIG = `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["components/*"],
      "@helpers": ["helpers/index.ts"]
    }
  }
}`

test("resolves imports using tsconfig path aliases", async () => {
  const circuitWebWorkerPromise = createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })

  const worker = await circuitWebWorkerPromise

  await worker.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "tsconfig.json": TS_CONFIG,
      "index.tsx": `
import { BoardWithResistor } from "@components/BoardWithResistor"

circuit.add(<BoardWithResistor />)
      `,
      "components/BoardWithResistor.tsx": `
import { resistorName } from "@helpers"

export const BoardWithResistor = () => (
  <board width="10mm" height="10mm">
    <resistor name={resistorName} resistance="1k" footprint="0402" />
  </board>
)
      `,
      "helpers/index.ts": `
export const resistorName = "R_ALIAS"
      `,
    },
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()
  const resistor = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === "R_ALIAS",
  )

  expect(resistor).toBeDefined()

  await worker.kill()
})
