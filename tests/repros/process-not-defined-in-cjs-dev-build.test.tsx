import { expect, test } from "bun:test"
import { evalCompiledJs } from "lib/eval/eval-compiled-js"

// Repro: importing a CommonJS module that reads `process.env.NODE_ENV` (as every
// *.development.js build does) used to throw "process is not defined" inside the
// eval sandbox because the evaluated function body never defined `process`.
//
// The bug only surfaces in the browser web worker, where `process` is not a
// global. The bun/node test runtime always defines `process` globally, so we
// temporarily remove it to reproduce the worker environment.
test("eval sandbox defines process even when globalThis.process is absent", () => {
  const originalProcess = (globalThis as any).process
  try {
    delete (globalThis as any).process

    const compiledCode = `
      if (process.env.NODE_ENV !== "production") {
        // dev-build branch
      }
      module.exports = { nodeEnv: process.env.NODE_ENV }
    `

    const result = evalCompiledJs(compiledCode, {})
    expect(result.exports.nodeEnv).toBe("production")
  } finally {
    ;(globalThis as any).process = originalProcess
  }
})
