import { expect, test } from "bun:test"
import { evalCompiledJs } from "lib/eval/eval-compiled-js"

test("surfaces a clear error when a required module resolved to undefined", () => {
  // A key that is present but undefined simulates a transitive dependency that
  // was registered as a placeholder but never actually evaluated. Requiring it
  // and reading a property used to throw a cryptic
  // "Cannot read properties of undefined (reading 'string')".
  const preSuppliedImports: Record<string, any> = {
    zod: undefined,
  }

  const compiledCode = `
    var zod = require("zod");
    module.exports = zod.string();
  `

  expect(() => evalCompiledJs(compiledCode, preSuppliedImports)).toThrow(
    /Import "zod" was resolved but not loaded \(module not resolved\)/,
  )
})

test("still evaluates modules that are fully loaded", () => {
  const preSuppliedImports: Record<string, any> = {
    "my-dep": { value: 42 },
  }

  const compiledCode = `
    var dep = require("my-dep");
    module.exports = dep.value;
  `

  const result = evalCompiledJs(compiledCode, preSuppliedImports)
  expect(result.exports).toBe(42)
})
