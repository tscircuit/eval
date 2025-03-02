import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    actionTimeout: 0,
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run start:browser-test-server",
    port: 3070,
    reuseExistingServer: !process.env.CI,
  },
})
