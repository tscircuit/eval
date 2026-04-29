import { createCircuitWebWorker } from "lib/worker"

export async function runUsbCConnectorTest(blobUrl: string) {
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
