import { createCircuitWebWorker } from "lib/index"
import blobUrl from "../dist/blob-url"

async function runTest() {
  try {
    // Create a circuit web worker
    console.log("creating worker...")
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerBlobUrl: blobUrl,
    })

    // Execute some example circuit code
    await circuitWebWorker.execute(`
      circuit.add(
        <board width="10mm" height="10mm">
          <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
      )
    `)

    // Wait for rendering to complete
    await circuitWebWorker.renderUntilSettled()

    // Get the circuit JSON
    const circuitJson = await circuitWebWorker.getCircuitJson()

    // Validate the circuit elements
    const resistor = circuitJson.find((el: any) => el.name === "R1")

    if (resistor && resistor.type === "source_component") {
      document.getElementById("output")!.textContent =
        "Success: Resistor found and valid"
      console.log("Test succeeded:", resistor)
    } else {
      document.getElementById("output")!.textContent =
        "Fail: Resistor not found or invalid"
      console.error("Test failed: Resistor not found or invalid")
    }
  } catch (error) {
    document.getElementById("output")!.textContent = "Fail: Test error occurred"
    console.error("Test failed with error:", error)
  }
}

// Run the test when the page loads
window.addEventListener("DOMContentLoaded", runTest)
