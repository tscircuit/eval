import { describe, it, expect } from "bun:test"
import { createCircuitWebWorker } from "../lib"

describe("fetch proxy validation", () => {
  it("should NOT proxy fetch requests when enableFetchProxy is false (default)", async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../dist/webworker/entrypoint.js", import.meta.url)
        .href,
      // enableFetchProxy not set, should default to false
    })

    const rawWorker: Worker = (worker as any).__rawWorker
    const messages: any[] = []
    rawWorker.addEventListener("message", (event) => {
      if (event.data?.type === "worker_fetch") messages.push(event.data)
    })

    await worker.execute(`
// Test that fetch calls are NOT proxied when enableFetchProxy is false
fetch("https://example.com/test")
  .catch(() => {}); // Ignore errors, we just want to see if it's proxied
`)

    await new Promise((r) => setTimeout(r, 100))

    // Should NOT have received any worker_fetch messages
    expect(messages.length).toBe(0)

    await worker.kill()
  })

  it("should proxy fetch requests when enableFetchProxy is true", async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../dist/webworker/entrypoint.js", import.meta.url)
        .href,
      enableFetchProxy: true,
    })

    const rawWorker: Worker = (worker as any).__rawWorker
    const messages: any[] = []
    rawWorker.addEventListener("message", (event) => {
      if (event.data?.type === "worker_fetch") messages.push(event.data)
    })

    await worker.execute(`
// Test that fetch calls are proxied when enableFetchProxy is true
fetch("https://example.com/test")
  .catch(() => {}); // Ignore errors, we just want to see if it's proxied
`)

    await new Promise((r) => setTimeout(r, 100))

    // Should have received a worker_fetch message indicating the proxy is working
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0].type).toBe("worker_fetch")
    expect(messages[0].input).toBe("https://example.com/test")

    await worker.kill()
  })

  it("should handle fetch errors properly through proxy when enabled", async () => {
    // This test verifies that the fetch proxy correctly handles and forwards errors
    const originalFetch = globalThis.fetch
    const fakeFetch = async () => {
      throw new Error("Network error")
    }
    globalThis.fetch = fakeFetch as any

    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../dist/webworker/entrypoint.js", import.meta.url)
        .href,
      enableFetchProxy: true,
    })

    const rawWorker: Worker = (worker as any).__rawWorker
    const messages: any[] = []
    rawWorker.addEventListener("message", (event) => {
      if (event.data?.type === "fetch_error") messages.push(event.data)
    })

    await worker.execute(`
fetch("https://example.com/test")
  .catch(e => {
    postMessage({ type: "fetch_error", name: e.name, message: e.message });
  });
`)

    await new Promise((r) => setTimeout(r, 100))

    expect(messages).toEqual([
      { type: "fetch_error", name: "Error", message: "Network error" },
    ])

    await worker.kill()
    globalThis.fetch = originalFetch
  })
})
