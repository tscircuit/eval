import { expect, test } from "bun:test"
import { stripComments } from "lib/utils/strip-comments"

test("strips line comments", () => {
  const code = "const a = 1 // trailing\nconst b = 2"
  const stripped = stripComments(code)
  expect(stripped).not.toContain("trailing")
  expect(stripped).toContain("const a = 1")
  expect(stripped).toContain("const b = 2")
})

test("keeps comment markers inside strings", () => {
  const code = `const url = "https://example.com" // trailing`
  const stripped = stripComments(code)
  expect(stripped).toContain("https://example.com")
  expect(stripped).not.toContain("trailing")
})

test("strips comments after a string ending in an escaped backslash", () => {
  // '\\\\' is a string literal containing a single backslash; its closing
  // quote is NOT escaped and the following comment must be stripped.
  const code = "const a = '\\\\' // comment\nconst b = 2 // gone"
  const stripped = stripComments(code)
  expect(stripped).not.toContain("comment")
  expect(stripped).not.toContain("gone")
})

test("strips block comments after a string ending in an escaped backslash", () => {
  const code = "const a = '\\\\' /* block */ const b = 2"
  const stripped = stripComments(code)
  expect(stripped).not.toContain("block")
  expect(stripped).toContain("const b = 2")
})

test("does not strip comment markers inside a later string after escaped backslash", () => {
  // After '\\\\' the parser must not treat the opening quote of the next
  // string as the end of the previous one, or the // inside it is stripped.
  const code = `const a = '\\\\' /* c */ const u = "https://x"`
  const stripped = stripComments(code)
  expect(stripped).toContain("https://x")
  expect(stripped).not.toContain(" c ")
})

test("keeps escaped quote inside a string", () => {
  const code = `const s = 'it\\'s' // trailing`
  const stripped = stripComments(code)
  expect(stripped).toContain("it\\'s")
  expect(stripped).not.toContain("trailing")
})
