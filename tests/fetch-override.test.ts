import { describe, it, expect } from "bun:test"
import { createCircuitWebWorker } from "../lib"

describe("fetch override", () => {
  it("allows worker to fetch via parent and propagates errors", async () => {
    const originalFetch = globalThis.fetch
    const mockFetch = async (input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("cjs.tscircuit.com")) {
        return new Response("module.exports = { default: 123 };", {
          status: 200,
        })
      }
      throw new Error("mock fail")
    }
    globalThis.fetch = mockFetch as any

    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../dist/webworker/entrypoint.js", import.meta.url)
        .href,
    })

    const rawWorker: Worker = (worker as any).__rawWorker
    const messages: any[] = []
    rawWorker.addEventListener("message", (event) => {
      if (event.data?.type === "fetch-error") messages.push(event.data)
    })

    await worker.execute(`
import val from "@tsci/test.snippet";
if (val !== 123) { throw new Error("snippet failed"); }
fetch("https://fail.test").catch(e => {
  postMessage({ type: "fetch-error", name: e.name, message: e.message });
});
`)

    await new Promise((r) => setTimeout(r, 10))

    expect(messages).toEqual([
      { type: "fetch-error", name: "Error", message: "mock fail" },
    ])

    await worker.kill()
    globalThis.fetch = originalFetch
  })
})
