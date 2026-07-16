import { afterEach, expect, test } from "bun:test"
import { createExecutionContext } from "lib/eval/execution-context"
import { importSnippet } from "lib/eval/import-snippet"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("falls back to the newest package release with a built dist", async () => {
  const requestedUrls: string[] = []
  const ctx = createExecutionContext({
    snippetsApiBaseUrl: "https://registry-api.test",
    cjsRegistryUrl: "https://cjs.test",
  })

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    requestedUrls.push(url)

    if (url === "https://cjs.test/tscircuit/ti") {
      return Response.json(
        {
          ok: false,
          error: {
            message:
              "CJS bundle not found. The package may not have been built yet.",
          },
        },
        { status: 404 },
      )
    }

    if (url === "https://registry-api.test/package_releases/list") {
      expect(init?.method).toBe("POST")
      expect(JSON.parse(init?.body as string)).toEqual({
        package_name: "tscircuit/ti",
      })
      return Response.json({
        ok: true,
        package_releases: [
          {
            package_release_id: "latest-release",
            version: "0.0.2",
            has_transpiled: false,
          },
          {
            package_release_id: "built-release",
            version: "0.0.1",
            has_transpiled: true,
          },
        ],
      })
    }

    if (
      url ===
      "https://registry-api.test/package_files/download?package_release_id=built-release&file_path=dist%2Findex.cjs"
    ) {
      return new Response("exports.loadedFrom = '0.0.1'")
    }

    return new Response("not found", { status: 404 })
  }) as typeof fetch

  await importSnippet("@tsci/tscircuit.ti", ctx)

  expect(ctx.preSuppliedImports["@tsci/tscircuit.ti"].loadedFrom).toBe("0.0.1")
  expect(requestedUrls).toEqual([
    "https://cjs.test/tscircuit/ti",
    "https://registry-api.test/package_releases/list",
    "https://registry-api.test/package_files/download?package_release_id=built-release&file_path=dist%2Findex.cjs",
  ])
})
