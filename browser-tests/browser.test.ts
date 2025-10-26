import { test, expect } from "@playwright/test"
import { spawn } from "node:child_process"

test("browser test server shows Success", async ({ page }) => {
  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Navigate to the page
  await page.goto("/")

  // Wait for the success message or timeout
  await expect(page.locator("#output")).toContainText("Success", {
    timeout: 10000,
  })
})
