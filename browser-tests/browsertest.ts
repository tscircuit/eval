import { createCircuitWebWorker } from "lib/worker"
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

async function runUsbCConnectorTest() {
  const outputDiv = document.getElementById("output")!
  const corsErrors: string[] = []

  const urlParams = new URLSearchParams(window.location.search)
  const proxyUrl = urlParams.get("proxy_url")

  if (!proxyUrl) {
    outputDiv.textContent = "Fail: proxy_url query parameter is required"
    return
  }

  // Monitor console errors for CORS issues from easyeda.com
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const msg = args.map(String).join(" ")
    if (msg.toLowerCase().includes("cors") || msg.includes("easyeda.com")) {
      corsErrors.push(msg)
    }
    originalConsoleError.apply(console, args)
  }

  try {
    console.log("creating worker for usb_c connector test...")
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerBlobUrl: blobUrl,
      verbose: true,
      easyEdaProxyConfig: {
        proxyEndpointUrl: proxyUrl,
      },
    })

    await circuitWebWorker.execute(`
      circuit.add(
        <board width="20mm" height="20mm">
          <connector name="J1" standard="usb_c" />
        </board>
      )
    `)

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()

    // Check for CORS errors
    if (corsErrors.length > 0) {
      outputDiv.textContent = `Fail: CORS errors detected: ${corsErrors.join("; ")}`
      console.error("Test failed: CORS errors detected", corsErrors)
      return
    }

    // Verify connector source component exists
    const connector = circuitJson.find(
      (el: any) => el.name === "J1" && el.type === "source_component",
    )
    if (!connector) {
      outputDiv.textContent = "Fail: USB-C connector source component not found"
      console.error("Test failed: connector source component not found")
      return
    }

    // Verify footprint elements from fetchPartCircuitJson (EasyEDA)
    const smtPads = circuitJson.filter((el: any) => el.type === "pcb_smtpad")
    const platedHoles = circuitJson.filter(
      (el: any) => el.type === "pcb_plated_hole",
    )

    if (smtPads.length > 0 || platedHoles.length > 0) {
      outputDiv.textContent = `Success: USB-C connector rendered with ${smtPads.length} SMT pads and ${platedHoles.length} plated holes`
      console.log("Test succeeded:", {
        smtPads: smtPads.length,
        platedHoles: platedHoles.length,
      })
    } else {
      outputDiv.textContent =
        "Fail: USB-C connector missing footprint elements (no SMT pads or plated holes)"
      console.error(
        "Test failed: no pcb_smtpad or pcb_plated_hole elements found",
      )
    }
  } catch (error: any) {
    const errorMsg = error.toString()
    if (
      errorMsg.toLowerCase().includes("cors") ||
      errorMsg.includes("easyeda.com")
    ) {
      outputDiv.textContent = `Fail: CORS error from easyeda.com: ${errorMsg}`
    } else {
      outputDiv.textContent = `Fail: Test error occurred: ${errorMsg}`
    }
    console.error("Test failed with error:", error)
  } finally {
    console.error = originalConsoleError
  }
}

// Run the test when the page loads
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search)
  const test_to_run = urlParams.get("test_to_run")

  if (test_to_run === "ngspice") {
    runNgspiceTest()
  } else if (test_to_run === "usb_c_connector") {
    runUsbCConnectorTest()
  } else {
    runDefaultTest()
  }
})
