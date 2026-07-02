import { expect, test } from "bun:test"
import { evalCompiledJs } from "lib/eval/eval-compiled-js"

// Errors thrown from the dynamically generated Function() body used to carry
// `eval`/`<anonymous>:line:col` frames whose offsets shifted with the compiled
// code. Error tracking fingerprinted otherwise-identical errors as separate
// issues. evalCompiledJs now strips those generated frames so repeat
// occurrences of the same error produce the same stable stack.
const runMissingExport = (compiledCode: string) => {
  const preSuppliedImports: Record<string, any> = {
    "./mod": { __esModule: true, realExport: 1, __typeOnlyExports__: [] },
  }
  try {
    evalCompiledJs(compiledCode, preSuppliedImports, "/")
  } catch (error: any) {
    return error as Error
  }
  throw new Error("Expected evalCompiledJs to throw")
}

// Regex for the generated-Function frames that should have been stripped.
const GENERATED_FRAME = /<anonymous>:|\beval at\b|^\s*at anonymous\s/m

// Only the frames inside the eval machinery are what error tracking
// fingerprints on; the test-runner caller frames naturally differ.
const evalFrames = (stack: string) =>
  stack
    .split("\n")
    .filter((line) => line.includes("eval-compiled-js"))
    .join("\n")

test("eval errors have no generated Function frames", () => {
  const error = runMissingExport(
    `var m = require("./mod");\nexports.x = m.missingName;`,
  )

  expect(error.message).toContain(`"missingName" is not exported by "./mod"`)
  expect(error.stack ?? "").not.toMatch(GENERATED_FRAME)
  // The stack should still be anchored at a real source frame
  expect(error.stack ?? "").toContain("eval-compiled-js")
})

test("identical eval errors produce identical eval-frame stacks regardless of code size", () => {
  // Two compilations of the same failing access, but padded so the generated
  // Function body has different line offsets. The fingerprint-relevant frames
  // should not diverge.
  const short = runMissingExport(
    `var m = require("./mod");\nexports.x = m.missingName;`,
  )
  const padded = runMissingExport(
    `${"var pad = 1;\n".repeat(20)}var m = require("./mod");\nexports.x = m.missingName;`,
  )

  expect(short.message).toBe(padded.message)
  expect(evalFrames(short.stack ?? "")).toBe(evalFrames(padded.stack ?? ""))
  expect(evalFrames(short.stack ?? "").length).toBeGreaterThan(0)
})
