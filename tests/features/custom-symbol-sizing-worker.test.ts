import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { repoFileUrl } from "tests/fixtures/resourcePaths"
import {
  customSymbolSizingCode,
  expectCustomSymbolSizing,
} from "tests/fixtures/custom-symbol-sizing"

test("built worker preserves round custom symbols and local viewbox ports", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
  })
  try {
    await worker.execute(customSymbolSizingCode)
    await worker.renderUntilSettled()
    const circuitJson = await worker.getCircuitJson()
    expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
    expectCustomSymbolSizing(circuitJson)
  } finally {
    await worker.kill()
  }
})
