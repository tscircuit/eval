import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./browser-tests",
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
    baseURL: "http://localhost:3070",
    actionTimeout: 0,
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run start:browser-test-server",
    url: "http://localhost:3070",
    reuseExistingServer: !process.env.CI,
  },
})
