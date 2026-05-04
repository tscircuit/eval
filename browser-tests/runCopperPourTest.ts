import { createCircuitWebWorker } from "lib/worker"

export async function runCopperPourTest(blobUrl: string) {
  const outputDiv = document.getElementById("output")!
  try {
    console.log("creating worker for copper pour test...")
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerBlobUrl: blobUrl,
      verbose: true,
    })

    console.log("worker created, executing copper pour...")

    let capturedError: string | null = null
    circuitWebWorker.on("asyncEffect:end", (event: any) => {
      if (event.error) {
        capturedError = `[${event.phase}] ${event.error}`
      }
    })

    await circuitWebWorker.execute(`
    circuit.add(
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
        <copperpour connectsTo="net.GND" layer="top" clearance="0.15mm" />
      </board>
    )
  `)

    await circuitWebWorker.renderUntilSettled()
    const circuitJson = await circuitWebWorker.getCircuitJson()
    const errors = circuitJson.filter(
      (el: any) => el.type === "pcb_component_error" || el.type === "pcb_error",
    )

    if (capturedError) {
      outputDiv.textContent = "Fail: " + capturedError
    } else if (errors.length > 0) {
      outputDiv.textContent = "Fail: " + (errors[0] as any).message
    } else {
      outputDiv.textContent = "Success: Copper pour initialized."
    }
  } catch (error: any) {
    outputDiv.textContent = "Fail: Test error occurred: " + error.toString()
    console.error("Test failed with error:", error)
  }
}
