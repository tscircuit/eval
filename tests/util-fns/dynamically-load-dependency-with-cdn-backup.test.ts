import { afterEach, expect, test } from "bun:test"
import { dynamicallyLoadDependencyWithCdnBackup } from "lib/utils/dynamically-load-dependency-with-cdn-backup"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("loads dependency esm from jscdn before jsdelivr", async () => {
  const requestedUrls: string[] = []

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString()
    requestedUrls.push(url)

    return new Response("export default 'jscdn'", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    })
  }) as typeof fetch

  const loadedModule = await dynamicallyLoadDependencyWithCdnBackup(
    "package-that-does-not-exist-in-node-modules",
  )

  expect(loadedModule).toBe("jscdn")
  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/package-that-does-not-exist-in-node-modules/latest/+esm",
  ])
})

test("falls back to jsdelivr esm when jscdn dependency esm fails", async () => {
  const requestedUrls: string[] = []

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString()
    requestedUrls.push(url)

    if (url.startsWith("https://jscdn.tscircuit.com/")) {
      return new Response("not found", {
        status: 404,
        statusText: "Not Found",
      })
    }

    return new Response("export default 'jsdelivr'", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    })
  }) as typeof fetch

  const loadedModule = await dynamicallyLoadDependencyWithCdnBackup(
    "package-that-does-not-exist-in-node-modules",
  )

  expect(loadedModule).toBe("jsdelivr")
  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/package-that-does-not-exist-in-node-modules/latest/+esm",
    "https://cdn.jsdelivr.net/npm/package-that-does-not-exist-in-node-modules/+esm",
  ])
})
