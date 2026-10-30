import { afterEach, expect, test } from "bun:test"
import { createExecutionContext } from "lib/eval/execution-context"
import { importSnippet } from "lib/eval/import-snippet"
import { CircuitRunner } from "lib/runner/CircuitRunner"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

const createContext = () =>
  createExecutionContext({
    snippetsApiBaseUrl: "https://registry.example.test",
    cjsRegistryUrl: "https://cjs.example.test",
  })

test("registry packages can use @tscircuit/props during initialization", async () => {
  const requestedUrls: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrls.push(input.toString())
    return new Response(`
      const { fanoutTracePath } = require("@tscircuit/props")
      exports.path = fanoutTracePath.parse({
        connection: ".J1 > .SWDIO",
        route: [
          { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
          { route_type: "wire", x: 10, y: 0, width: 0.2, layer: "top" },
        ],
      })
    `)
  }) as typeof fetch
  const runner = new CircuitRunner({
    cjsRegistryUrl: "https://cjs.example.test",
  })

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import { path } from "./parts"
        circuit.add(<board width={path.route[1].x} height={10} />)
      `,
      "parts.tsx": `export { path } from "@tsci/test.connector"`,
    },
  })
  await runner.renderUntilSettled()

  expect(requestedUrls).toEqual(["https://cjs.example.test/test/connector"])
  expect(await runner.getCircuitJson()).toContainEqual(
    expect.objectContaining({ type: "pcb_board", width: 10, height: 10 }),
  )
})

test("registry package initialization errors include the package and original cause", async () => {
  globalThis.fetch = (async (_input: RequestInfo | URL) =>
    new Response(
      'throw new Error("package initialization failed")',
    )) as typeof fetch
  const ctx = createContext()

  await expect(importSnippet("@tsci/test.broken", ctx)).rejects.toMatchObject({
    message:
      'Error importing "@tsci/test.broken": package initialization failed',
    cause: expect.objectContaining({
      message: "package initialization failed",
    }),
  })
  expect(ctx.preSuppliedImports).not.toHaveProperty("@tsci/test.broken")
})

test("registry fetch errors include the package and original cause", async () => {
  const fetchError = new Error("registry unavailable")
  globalThis.fetch = (async (_input: RequestInfo | URL): Promise<Response> => {
    throw fetchError
  }) as typeof fetch
  const ctx = createContext()

  await expect(
    importSnippet("@tsci/test.unavailable", ctx),
  ).rejects.toMatchObject({
    message: 'Error fetching "@tsci/test.unavailable": registry unavailable',
    cause: fetchError,
  })
  expect(ctx.preSuppliedImports).not.toHaveProperty("@tsci/test.unavailable")
})
