import { spawn } from "node:child_process"
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
