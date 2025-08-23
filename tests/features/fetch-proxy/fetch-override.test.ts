import { describe, it, expect } from "bun:test"
import { createCircuitWebWorker } from "lib"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

describe("fetch override", () => {
  it("allows worker to fetch via parent and propagates errors", async () => {
    const originalFetch = globalThis.fetch
    const fakeFetch = async (input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("cjs.tscircuit.com")) {
        return new Response("module.exports = { default: 123 };", {
          status: 200,
        })
      }
      throw new Error("fake fail")
    }
    globalThis.fetch = fakeFetch as any

    const worker = await createCircuitWebWorker({
      webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
      enableFetchProxy: true,
    })

    const rawWorker: Worker = (worker as any).__rawWorker
    const messages: any[] = []
    rawWorker.addEventListener("message", (event) => {
      if (event.data?.type === "fetch_error") messages.push(event.data)
    })

    await worker.execute(`
import val from "@tsci/test.snippet";
if (val !== 123) { throw new Error("snippet failed"); }
fetch("https://fail.test").catch(e => {
  postMessage({ type: "fetch_error", name: e.name, message: e.message });
});
`)

    await new Promise((r) => setTimeout(r, 10))

    expect(messages).toEqual([
      { type: "fetch_error", name: "Error", message: "fake fail" },
    ])

    await worker.kill()
    globalThis.fetch = originalFetch
  })
})
