import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("evaluation errors keep the original error type and stack", async () => {
  const runner = new CircuitRunner()

  let caught: any
  try {
    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          const notAnArray = 5
          notAnArray.find((x) => x)
          export default () => null
        `,
      },
    })
  } catch (error) {
    caught = error
  }

  // The importer wraps the message for context, but keeps the original error,
  // so its type and stack point at the real throw site.
  expect(caught).toBeInstanceOf(TypeError)
  expect(caught.message).toContain('Error evaluating "index.tsx"')
  expect(caught.message).toContain("is not a function")
  expect(typeof caught.stack).toBe("string")
})
