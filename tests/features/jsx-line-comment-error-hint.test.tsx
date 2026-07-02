import { test, expect } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { getJsxCommentErrorHint } from "lib/eval/get-jsx-comment-error-hint"

test("a `//` comment used as a JSX child gets an actionable hint", async () => {
  const runner = new CircuitRunner()

  const promise = (async () => {
    await runner.executeWithFsMap({
      fsMap: {
        "index.tsx": `
          export default () => (
            <board width="10mm" height="10mm">
              <resistor name="R1" resistance="1k" footprint="0402" />
              // external signal source connects here
              <capacitor name="C1" capacitance="1uF" footprint="0402" />
            </board>
          )
        `,
      },
    })
    await runner.renderUntilSettled()
  })()

  await expect(promise).rejects.toThrow(
    /use a JSX comment `\{\/\* \.\.\. \*\/\}` instead/,
  )
})

test("getJsxCommentErrorHint only fires for `//` text nodes", () => {
  expect(
    getJsxCommentErrorHint(
      `Invalid JSX Element: Expected a React component but received text "// explicit ground net"`,
    ),
  ).toContain("{/* ... */}")

  // Regular (non-comment) stray text should not be misattributed to a comment.
  expect(
    getJsxCommentErrorHint(
      `Invalid JSX Element: Expected a React component but received text "hello world"`,
    ),
  ).toBeNull()

  // Unrelated errors are left untouched.
  expect(getJsxCommentErrorHint("Some other error")).toBeNull()
  expect(getJsxCommentErrorHint(undefined)).toBeNull()
})
