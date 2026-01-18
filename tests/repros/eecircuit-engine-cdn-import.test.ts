import { describe, expect, test } from "bun:test"
import { transformJsDelivrImports } from "lib/utils/dynamically-load-dependency-with-cdn-backup"

/**
 * This test reproduces the error:
 * "simulation_unknown_experiment_error:Error resolving module specifier '/npm/eecircuit-engine@1.5.6/+esm'"
 *
 * The issue occurs when:
 * 1. ngspice-spice-engine is loaded from jsdelivr CDN
 * 2. The CDN bundle contains: import("/npm/eecircuit-engine@1.5.6/+esm")
 * 3. When loaded via blob URL, the browser resolves "/npm/..." relative to page origin
 *
 * This test verifies the CDN code contains the problematic import pattern
 * and that our transformation would fix it.
 */

describe("eecircuit-engine CDN import issue", () => {
  test("ngspice-spice-engine CDN bundle contains relative /npm/ import that would fail in blob URL", async () => {
    // Fetch the actual CDN bundle
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@tscircuit/ngspice-spice-engine/+esm",
    )
    expect(res.ok).toBe(true)

    const code = await res.text()

    // Verify the problematic pattern exists
    const hasRelativeNpmImport = code.includes('import("/npm/')
    expect(hasRelativeNpmImport).toBe(true)

    // Verify the specific eecircuit-engine import exists
    const hasEecircuitImport = /import\s*\(\s*["']\/npm\/eecircuit-engine/.test(
      code,
    )
    expect(hasEecircuitImport).toBe(true)
  })

  test("transformJsDelivrImports fixes the relative import", () => {
    const input =
      'const{Simulation:t}=await import("/npm/eecircuit-engine@1.5.6/+esm")'
    const output = transformJsDelivrImports(input)

    expect(output).toBe(
      'const{Simulation:t}=await import("https://cdn.jsdelivr.net/npm/eecircuit-engine@1.5.6/+esm")',
    )
    expect(output).not.toContain('"/npm/')
  })

  test("blob URL with untransformed /npm/ import fails with module resolution error", async () => {
    // This reproduces the actual error:
    // "Cannot find module '/npm/eecircuit-engine@1.5.6/+esm'"
    // which in browser manifests as:
    // "Error resolving module specifier '/npm/eecircuit-engine@1.5.6/+esm'"
    const codeWithRelativeImport = `
      export default async function test() {
        const { Simulation } = await import("/npm/eecircuit-engine@1.5.6/+esm");
        return Simulation;
      }
    `

    const blob = new Blob([codeWithRelativeImport], {
      type: "application/javascript",
    })
    const url = URL.createObjectURL(blob)

    try {
      const module = await import(url)
      // Calling the function triggers the dynamic import which fails
      let error: Error | null = null
      try {
        await module.default()
      } catch (e: any) {
        error = e
        console.log("Reproduced error:", e.message)
      }
      expect(error).not.toBeNull()
      expect(error!.message).toMatch(
        /Cannot find module.*\/npm\/eecircuit-engine/,
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  test("blob URL with transformed /npm/ import resolves to correct jsdelivr URL", async () => {
    // After transformation, the import points to the full jsdelivr URL
    const codeWithRelativeImport = `
      export default async function test() {
        const { Simulation } = await import("/npm/eecircuit-engine@1.5.6/+esm");
        return Simulation;
      }
    `

    const transformedCode = transformJsDelivrImports(codeWithRelativeImport)

    // Verify the transformation happened
    expect(transformedCode).toContain(
      "https://cdn.jsdelivr.net/npm/eecircuit-engine",
    )
    expect(transformedCode).not.toContain('"/npm/')

    const blob = new Blob([transformedCode], {
      type: "application/javascript",
    })
    const url = URL.createObjectURL(blob)

    try {
      const module = await import(url)
      // In Bun/Node, https imports don't work the same as browser
      // But we can verify it's no longer failing with the /npm/ path error
      await expect(module.default()).rejects.not.toThrow(
        /Cannot find module.*\/npm\//,
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  test("verify the CDN code transformation produces valid absolute URLs", async () => {
    // Fetch and transform the actual CDN code
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@tscircuit/ngspice-spice-engine/+esm",
    )
    const originalCode = await res.text()
    const transformedCode = transformJsDelivrImports(originalCode)

    // Verify no relative /npm/ imports remain
    expect(transformedCode).not.toMatch(/import\s*\(\s*["']\/npm\//)
    expect(transformedCode).not.toMatch(/from\s*["']\/npm\//)

    // Verify the imports are now absolute
    expect(transformedCode).toContain(
      "https://cdn.jsdelivr.net/npm/eecircuit-engine",
    )
  })
})
