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

test("resolves jsdelivr relative /npm imports while evaluating cdn package code", async () => {
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

    if (url === "https://cdn.jsdelivr.net/npm/example-package/+esm") {
      return new Response(
        'import value from "/npm/dep-package@1.0.0/+esm"; export const loadedValue = value',
        {
          status: 200,
          headers: { "content-type": "application/javascript" },
        },
      )
    }

    if (url === "https://cdn.jsdelivr.net/npm/dep-package@1.0.0/+esm") {
      return new Response("export default 'dep-loaded'", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      })
    }

    return new Response("not found", {
      status: 404,
      statusText: "Not Found",
    })
  }) as typeof fetch

  await importNpmPackageFromCdn({ importName: "example-package" }, ctx)

  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/example-package/latest/+esm",
    "https://cdn.jsdelivr.net/npm/example-package/+esm",
    "https://jscdn.tscircuit.com/dep-package/1.0.0/+esm",
    "https://cdn.jsdelivr.net/npm/dep-package@1.0.0/+esm",
  ])
  expect(ctx.preSuppliedImports["example-package"].loadedValue).toBe(
    "dep-loaded",
  )
  expect(ctx.preSuppliedImports["/npm/dep-package@1.0.0/+esm"].default).toBe(
    "dep-loaded",
  )
})

test("resolves full jscdn url imports while evaluating cdn package code", async () => {
  const requestedUrls: string[] = []
  const ctx = createTestExecutionContext()

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString()
    requestedUrls.push(url)

    if (url === "https://jscdn.tscircuit.com/example-package/latest/+esm") {
      return new Response(
        'import value from "https://jscdn.tscircuit.com/dep-package/latest/+esm"; export const loadedValue = value',
        {
          status: 200,
          headers: { "content-type": "application/javascript" },
        },
      )
    }

    if (url === "https://jscdn.tscircuit.com/dep-package/latest/+esm") {
      return new Response("export default 'dep-loaded'", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      })
    }

    return new Response("not found", {
      status: 404,
      statusText: "Not Found",
    })
  }) as typeof fetch

  await importNpmPackageFromCdn({ importName: "example-package" }, ctx)

  expect(requestedUrls).toEqual([
    "https://jscdn.tscircuit.com/example-package/latest/+esm",
    "https://jscdn.tscircuit.com/dep-package/latest/+esm",
  ])
  expect(ctx.preSuppliedImports["example-package"].loadedValue).toBe(
    "dep-loaded",
  )
  expect(
    ctx.preSuppliedImports["https://jscdn.tscircuit.com/dep-package/latest/+esm"]
      .default,
  ).toBe("dep-loaded")
})
