import { afterEach, describe, expect, test } from "bun:test"
import {
  fetchWebWorkerEntrypointBlobFromCdn,
  getWebWorkerEntrypointCdnUrls,
} from "lib/worker"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("webworker CDN fallback", () => {
  test("uses jscdn first and falls back to jsdelivr when jscdn fails", async () => {
    const requestedUrls: string[] = []
    const fallbackBlob = new Blob(["export {}"], {
      type: "application/javascript",
    })

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = input.toString()
      requestedUrls.push(url)

      if (url.includes("jscdn.tscircuit.com")) {
        return new Response("not found", {
          status: 404,
          statusText: "Not Found",
        })
      }

      return new Response(fallbackBlob, { status: 200 })
    }) as typeof fetch

    const blob = await fetchWebWorkerEntrypointBlobFromCdn("1.2.3")

    expect(await blob.text()).toBe("export {}")
    expect(requestedUrls).toEqual(
      getWebWorkerEntrypointCdnUrls("1.2.3").slice(0, 2),
    )
  })
})
