import { afterEach, expect, test } from "bun:test"
import { importNpmPackageFromCdn } from "lib/eval/import-npm-package-from-cdn"
import type { ExecutionContext } from "lib/eval/execution-context"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createTestExecutionContext(): ExecutionContext {
  return {
    fsMap: {},
    entrypoint: "index.tsx",
    preSuppliedImports: {},
    circuit: {} as ExecutionContext["circuit"],
    logger: {
      info: () => {},
      getLogs: () => [],
      stringifyLogs: () => "",
    },
    tsConfig: null,
    importStack: [],
    currentlyImporting: new Set(),
    snippetsApiBaseUrl: "",
    cjsRegistryUrl: "",
  }
}

test("imports npm esm packages from jscdn first", async () => {
  const requestedUrls: string[] = []
  const ctx = createTestExecutionContext()

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString()
    requestedUrls.push(url)

    return new Response("export const loadedFrom = 'jscdn'", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    })
  }) as typeof fetch

  await importNpmPackageFromCdn({ importName: "example-package" }, ctx)

  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/example-package/latest/+esm",
  ])
  expect(ctx.preSuppliedImports["example-package"].loadedFrom).toBe("jscdn")
})

test("falls back to jsdelivr esm when jscdn esm fails", async () => {
  const requestedUrls: string[] = []
  const ctx = createTestExecutionContext()

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString()
    requestedUrls.push(url)

    if (url.startsWith("https://jscdn.tscircuit.com/")) {
      return new Response("not found", {
        status: 404,
        statusText: "Not Found",
      })
    }

    return new Response("export const loadedFrom = 'jsdelivr'", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    })
  }) as typeof fetch

  await importNpmPackageFromCdn({ importName: "example-package" }, ctx)

  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/example-package/latest/+esm",
    "https://cdn.jsdelivr.net/npm/example-package/+esm",
  ])
  expect(ctx.preSuppliedImports["example-package"].loadedFrom).toBe("jsdelivr")
})
