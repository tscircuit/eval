import { createServer, type Server } from "node:http"
import { expect, test } from "@playwright/test"

test("browser test server shows Success", async ({ page }) => {
  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Navigate to the page
  await page.goto("http://localhost:3070")

  // Wait for the success message or timeout
  await expect(page.locator("#output")).toContainText("Success", {
    timeout: 10000,
  })
})

test("ngspice simulation runs successfully in browser", async ({ page }) => {
  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Navigate to the page with ngspice test parameter
  await page.goto("http://localhost:3070?test_to_run=ngspice")

  // Wait for the success message or timeout (longer timeout for ngspice simulation)
  await expect(page.locator("#output")).toContainText("Success", {
    timeout: 60000,
  })
})

test("usb_c connector renders without CORS errors", async ({ page }) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  let proxiedRequestCount = 0
  let proxiedEasyEdaRequestCount = 0

  // Start a local proxy server that forwards EasyEDA API requests from the
  // browser (avoiding CORS).  This is exactly the role easyEdaProxyConfig
  // plays in production — the browser hits this proxy instead of easyeda.com.
  const proxyServer: Server = await new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      // CORS headers so the browser worker can reach us
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Headers", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      const targetUrl = req.headers["x-target-url"] as string | undefined
      if (!targetUrl) {
        res.writeHead(400)
        res.end("Missing X-Target-Url header")
        return
      }
      proxiedRequestCount += 1
      if (targetUrl.includes("easyeda.com")) {
        proxiedEasyEdaRequestCount += 1
      }

      try {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const reqBody = Buffer.concat(chunks).toString()

        const upstream = await fetch(targetUrl, {
          method: req.method,
          headers: { "Content-Type": req.headers["content-type"] ?? "" },
          body:
            req.method !== "GET" && req.method !== "HEAD" ? reqBody : undefined,
        })
        const body = await upstream.text()
        res.writeHead(upstream.status, {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/json",
        })
        res.end(body)
      } catch (err: any) {
        res.writeHead(502)
        res.end(err.message)
      }
    })
    server.listen(0, "127.0.0.1", () => resolve(server))
  })

  const proxyPort = (proxyServer.address() as any).port
  const proxyUrl = `http://127.0.0.1:${proxyPort}`

  // Collect any CORS-related network failures from easyeda.com
  const corsErrors: string[] = []
  page.on("requestfailed", (request) => {
    const url = request.url()
    const failure = request.failure()?.errorText ?? ""
    if (url.includes("easyeda.com") || failure.toLowerCase().includes("cors")) {
      corsErrors.push(`${url}: ${failure}`)
    }
  })

  try {
    await page.goto(
      `http://localhost:3070?test_to_run=usb_c_connector&proxy_url=${encodeURIComponent(proxyUrl)}`,
    )

    // Longer timeout — involves network calls to jlcsearch + easyeda via proxy
    await expect(page.locator("#output")).toContainText(
      "Success: USB-C connector rendered with",
      { timeout: 60000 },
    )

    // Double-check no CORS failures were captured at the network level
    expect(corsErrors).toEqual([])
    expect(proxiedRequestCount).toBeGreaterThan(0)
    expect(proxiedEasyEdaRequestCount).toBeGreaterThan(0)
  } finally {
    proxyServer.close()
  }
})

test("copper pour successfully renders in browser (verifies manifold-2d WASM)", async ({
  page,
}) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await page.goto("http://localhost:3070?test_to_run=copperpour")

  // The output div should show success if WASM initialization and rendering worked
  await expect(page.locator("#output")).toContainText(
    "Success: Copper pour initialized.",
    { timeout: 15000 },
  )
})

test("browser worker preserves custom symbol proportions and local ports", async ({
  page,
}) => {
  await page.goto("http://localhost:3070?test_to_run=custom_symbol_sizing")
  const output = page.locator("#output")
  await expect(output).toContainText("Success: custom symbol sizing", {
    timeout: 15000,
  })
  const circuitJson = JSON.parse(
    (await output.getAttribute("data-circuit-json"))!,
  ) as import("circuit-json").CircuitJson
  for (const [name, width, height] of [
    ["Legacy", 2 / 1.1, 1.2],
    ["WidthOnly", 2 / 1.1, 2 / 1.1],
    ["Contained", 1.2, 1.2],
    ["LocalViewbox", 2, 2],
    ["Stretched", 2, 1.2],
  ] as const) {
    const source = circuitJson
      .filter((element) => element.type === "source_component")
      .find((component) => component.name === name)!
    const component = circuitJson
      .filter((element) => element.type === "schematic_component")
      .find(
        (component) =>
          component.source_component_id === source.source_component_id,
      )!
    const path = circuitJson
      .filter((element) => element.type === "schematic_path")
      .find(
        (path) =>
          path.schematic_component_id === component.schematic_component_id,
      )!
    expect(
      Math.max(...path.points.map((point) => point.x)) -
        Math.min(...path.points.map((point) => point.x)),
    ).toBeCloseTo(width, 6)
    expect(
      Math.max(...path.points.map((point) => point.y)) -
        Math.min(...path.points.map((point) => point.y)),
    ).toBeCloseTo(height, 6)
    if (name === "LocalViewbox") {
      const port = circuitJson
        .filter((element) => element.type === "schematic_port")
        .find(
          (port) =>
            port.schematic_component_id === component.schematic_component_id,
        )!
      expect(port.center.x).toBeCloseTo(5, 6)
      expect(port.center.y).toBeCloseTo(2, 6)
    }
  }
  expect(
    circuitJson.filter((element) => element.type.endsWith("_error")),
  ).toEqual([])
})
