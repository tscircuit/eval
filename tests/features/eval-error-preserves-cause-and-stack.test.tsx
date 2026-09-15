import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("evaluation error keeps the original cause and stack", async () => {
  let thrownError: any

  try {
    await runTscircuitCode(`
      const resistance = UNDEFINED_IDENTIFIER
      export default () => <resistor name="R1" resistance={resistance} />
    `)
  } catch (error) {
    thrownError = error
  }

  expect(thrownError).toBeInstanceOf(Error)
  // The wrapper still names the file that failed to evaluate.
  expect(thrownError.message).toContain("Error evaluating")
  expect(thrownError.message).toContain("UNDEFINED_IDENTIFIER is not defined")

  // The original error is attached as the cause.
  expect(thrownError.cause).toBeInstanceOf(Error)
  expect(thrownError.cause.message).toContain(
    "UNDEFINED_IDENTIFIER is not defined",
  )

  // The thrown error keeps the original stack, so error tracking points at the
  // real throw site instead of a single synthetic importLocalFile frame.
  expect(thrownError.stack).toBe(thrownError.cause.stack)
})
