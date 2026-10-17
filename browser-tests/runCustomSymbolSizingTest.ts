import { createCircuitWebWorker } from "lib/worker"
import { customSymbolSizingCode } from "../tests/fixtures/custom-symbol-sizing-code"

export async function runCustomSymbolSizingTest(blobUrl: string) {
  const output = document.getElementById("output")!
  const worker = await createCircuitWebWorker({ webWorkerBlobUrl: blobUrl })
  try {
    await worker.execute(customSymbolSizingCode)
    await worker.renderUntilSettled()
    output.dataset.circuitJson = JSON.stringify(await worker.getCircuitJson())
    output.textContent = "Success: custom symbol sizing"
  } catch (error) {
    output.textContent = `Fail: ${String(error)}`
  } finally {
    await worker.kill()
  }
}
