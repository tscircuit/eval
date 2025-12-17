import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner"

test("uses sessionToken when fetching private @tsci packages", async () => {
  const originalFetch = globalThis.fetch
  const requests: Array<{ url: string; init?: RequestInit }> = []

  const fakeFetch = async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    requests.push({ url, init })

    if (url.startsWith("https://cjs.tscircuit.com/")) {
      return new Response("not found", { status: 404, statusText: "Not Found" })
    }

    if (url.startsWith("https://npm.tscircuit.com/")) {
      return new Response('export default "private-content";', { status: 200 })
    }

    if (url.startsWith("https://cdn.jsdelivr.net/npm/")) {
      return new Response('export default "public-fallback";', { status: 200 })
    }

    throw new Error(`Unexpected fetch url: ${url}`)
  }

  globalThis.fetch = fakeFetch as any

  try {
    const runner = new CircuitRunner({ sessionToken: "my-session-token" })

    await runner.execute(`
      import privateValue from "@tsci/private-module";
      if (privateValue !== "private-content") {
        throw new Error("Private module not loaded with session token")
      }
      circuit.add(<resistor name="R1" resistance="1k" />);
    `)

    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()

    expect(
      circuitJson.find(
        (element) => element.type === "source_component" && element.name === "R1",
      ),
    ).toBeDefined()

    const privateRegistryRequest = requests.find((request) =>
      request.url.startsWith("https://npm.tscircuit.com/"),
    )
    expect(privateRegistryRequest).toBeDefined()
    const headers =
      (privateRegistryRequest?.init?.headers as Record<string, string>) || {}
    expect(
      headers.Authorization ?? headers.authorization,
    ).toBe("Bearer my-session-token")
  } finally {
    globalThis.fetch = originalFetch
  }
})
