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

test("easyeda platformFetch routes via proxy in browser", async ({ page }) => {
  test.setTimeout(120000)

  const browserOrigin = "http://localhost:3070"
  const context = page.context()

  // Emulate the proxy endpoint in test so we can validate real browser flow
  // without requiring authenticated access to the production proxy.
  await context.route(
    "https://registry-api.tscircuit.com/**",
    async (route) => {
      const request = route.request()
      if (!request.url().includes("/proxy")) {
        await route.continue()
        return
      }

      if (request.method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": browserOrigin,
            "access-control-allow-credentials": "true",
            "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            "access-control-allow-headers": "*",
          },
        })
        return
      }

      const requestHeaders = request.headers()
      const targetUrl = requestHeaders["x-target-url"]
      if (!targetUrl) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": browserOrigin,
            "access-control-allow-credentials": "true",
          },
          body: JSON.stringify({ error: "x-target-url header is required" }),
        })
        return
      }

      const upstreamHeaders = new Headers()
      if (requestHeaders["accept"]) {
        upstreamHeaders.set("accept", requestHeaders["accept"])
      }
      if (requestHeaders["content-type"]) {
        upstreamHeaders.set("content-type", requestHeaders["content-type"])
      }
      if (requestHeaders["x-requested-with"]) {
        upstreamHeaders.set(
          "x-requested-with",
          requestHeaders["x-requested-with"],
        )
      }
      if (requestHeaders["x-sender-origin"]) {
        upstreamHeaders.set("origin", requestHeaders["x-sender-origin"])
      }
      if (requestHeaders["x-sender-referer"]) {
        upstreamHeaders.set("referer", requestHeaders["x-sender-referer"])
      }
      if (requestHeaders["x-sender-user-agent"]) {
        upstreamHeaders.set("user-agent", requestHeaders["x-sender-user-agent"])
      }
      if (requestHeaders["x-sender-cookie"]) {
        upstreamHeaders.set("cookie", requestHeaders["x-sender-cookie"])
      }
      if (requestHeaders["x-sender-host"]) {
        const host = requestHeaders["x-sender-host"].replace(/^https?:\/\//, "")
        upstreamHeaders.set("host", host)
        upstreamHeaders.set("authority", host)
      }

      const requestBody =
        request.method() === "GET" || request.method() === "HEAD"
          ? undefined
          : (request.postData() ?? undefined)

      const upstreamResponse = await fetch(targetUrl, {
        method: request.method(),
        headers: upstreamHeaders,
        body: requestBody,
      })
      const upstreamResponseBody = await upstreamResponse.text()

      await route.fulfill({
        status: upstreamResponse.status,
        headers: {
          "content-type":
            upstreamResponse.headers.get("content-type") ?? "application/json",
          "access-control-allow-origin": browserOrigin,
          "access-control-allow-credentials": "true",
        },
        body: upstreamResponseBody,
      })
    },
  )

  await new Promise((resolve) => setTimeout(resolve, 1000))

  await page.goto("http://localhost:3070?test_to_run=easyeda_platformfetch")

  await expect(page.locator("#output")).toContainText(
    "Success: USB-C footprint verified",
    {
      timeout: 60000,
    },
  )
})
