import { createCircuitWebWorker } from "lib/worker"
import { createEasyEdaAwarePlatformFetch } from "lib/utils/create-easyeda-aware-platform-fetch"
// @ts-ignore
import blobUrl from "../dist/blob-url"

async function runDefaultTest() {
  try {
    // Create a circuit web worker
    console.log("creating worker...")
    console.log("blobUrl", blobUrl)
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerBlobUrl: blobUrl,
      verbose: true,
    })

    console.log("asking for version...")
    const version = await circuitWebWorker.version()
    console.log("version", version)

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

async function runNgspiceTest() {
  const outputDiv = document.getElementById("output")!
  try {
    console.log("creating worker for ngspice test...")
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerBlobUrl: blobUrl,
      verbose: true,
    })

    console.log("worker created, executing spice simulation...")

    await circuitWebWorker.execute(`
    circuit.add(
      <board schMaxTraceDistance={10} routingDisabled>
        <voltagesource name="V1" voltage="5V" />
        <switch name="SW1" spst simSwitchFrequency="1kHz" />
        <trace from=".V1 > .terminal1" to=".SW1 > .pin1" />
        <resistor
          name="R1"
          resistance="1k"
          footprint="0402"
          connections={{ pin1: ".SW1 > .pin2", pin2: ".V1 > .terminal2" }}
        />
        <voltageprobe connectsTo={".R1 > .pin1"} />
        <analogsimulation
          duration="4ms"
          timePerStep="10us"
          spiceEngine="ngspice"
        />
      </board>
    )
  `)

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()

    const simGraph = circuitJson.some(
      (el) => el.type === "simulation_transient_voltage_graph",
    )

    if (simGraph) {
      outputDiv.textContent =
        "Success: ngspice simulation ran and produced a graph."
      console.log("Test succeeded: ngspice simulation ran.")
    } else {
      outputDiv.textContent =
        "Fail: ngspice simulation did not produce a graph."
      console.error("Test failed: ngspice simulation did not produce a graph.")
    }
  } catch (error: any) {
    outputDiv.textContent = `Fail: Test error occurred: ${error.toString()}`
    console.error("Test failed with error:", error)
  }
}

async function runEasyedaPlatformFetchTest() {
  const outputDiv = document.getElementById("output")!
  const platformFetch = createEasyEdaAwarePlatformFetch(
    "https://registry-api.tscircuit.com",
  )
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerBlobUrl: blobUrl,
    verbose: true,
  })

  try {
    // Directly exercise the EasyEDA-aware proxy fetch wrapper.
    await platformFetch("https://easyeda.com/api/components/search", {
      method: "POST",
      headers: {
        origin: "https://easyeda.com",
        referer: "https://easyeda.com/editor",
      },
      body: "type=3&wd=C165948",
    })

    await circuitWebWorker.execute(`
      circuit.add(
        <board width="10mm" height="10mm">
          <connector
            name="U1"
            standard="usb_c"
            manufacturerPartNumber="C165948"
          />
        </board>
      )
    `)

    await circuitWebWorker.renderUntilSettled()
    const circuitJson = await circuitWebWorker.getCircuitJson()
    const smtPadCount = circuitJson.filter(
      (element: any) => element.type === "pcb_smtpad",
    ).length
    const platedHoleCount = circuitJson.filter(
      (element: any) => element.type === "pcb_plated_hole",
    ).length
    const unknownError = circuitJson.find(
      (element: any) => element.type === "unknown_error_finding_part",
    ) as { message?: string } | undefined
    if (unknownError) {
      outputDiv.textContent = `Fail: ${unknownError.message}`
      return
    }

    if (smtPadCount === 0 || platedHoleCount === 0) {
      outputDiv.textContent = `Fail: missing usb_c footprint data (pads=${smtPadCount}, holes=${platedHoleCount})`
      return
    }

    outputDiv.textContent = `Success: USB-C footprint verified (pads=${smtPadCount}, holes=${platedHoleCount})`
  } catch (error: any) {
    outputDiv.textContent = `Fail: Test error occurred: ${error.toString()}`
    console.error("easyeda platformFetch test failed", error)
  } finally {
    await circuitWebWorker.kill().catch((error) => {
      console.error("failed to kill circuit worker", error)
    })
  }
}

// Run the test when the page loads
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search)
  const test_to_run = urlParams.get("test_to_run")

  if (test_to_run === "ngspice") {
    runNgspiceTest()
  } else if (test_to_run === "easyeda_platformfetch") {
    runEasyedaPlatformFetchTest()
  } else {
    runDefaultTest()
  }
})
