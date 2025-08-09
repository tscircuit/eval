import { importSnippet } from "../webworker/import-snippet"
import { createExecutionContext } from "../webworker/execution-context"
import { expect, test } from "bun:test"

// Ensure fetch errors are surfaced clearly when snippets cannot be loaded
// (e.g. due to Content Security Policy restrictions).
test("importSnippet surfaces fetch errors", async () => {
  const ctx = createExecutionContext({
    snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
    cjsRegistryUrl: "https://cjs.tscircuit.com",
    verbose: false,
    platform: undefined,
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.reject(new Error("network blocked"))) as unknown as typeof fetch

  await expect(importSnippet("@tsci/example.missing", ctx)).rejects.toThrow(
    'Failed to fetch snippet "@tsci/example.missing"',
  )

  globalThis.fetch = originalFetch
})
