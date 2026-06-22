import { describe, expect, test } from "bun:test"
import { transformJsDelivrImports } from "lib/utils/dynamically-load-dependency-with-cdn-backup"

const bundleWithRelativeNpmImport = `
  const { Simulation } = await import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm")
`

const bundleWithAbsoluteJscdnImport = `
  const engineUrl = "https://jscdn.tscircuit.com/@tscircuit/eecircuit-engine/1.7.4/+esm"
`

/**
 * This test reproduces the error:
 * "simulation_unknown_experiment_error:Error resolving module specifier '/npm/@tscircuit/eecircuit-engine@1.7.4/+esm'"
 *
 * The issue occurred when a CDN bundle contained:
 * import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm")
 *
 * When loaded via blob URL, the browser resolves "/npm/..." relative to page origin.
 *
 * These tests use inline fixtures so they stay deterministic even if the live
 * CDN output changes over time.
 */

describe("@tscircuit/eecircuit-engine CDN import issue", () => {
  test("legacy CDN bundle contains relative /npm/ import that would fail in blob URL", () => {
    // Verify the problematic pattern exists
    const hasRelativeNpmImport =
      bundleWithRelativeNpmImport.includes('import("/npm/')
    expect(hasRelativeNpmImport).toBe(true)

    // Verify the specific @tscircuit/eecircuit-engine import exists
    const hasEecircuitImport =
      /import\s*\(\s*["']\/npm\/@tscircuit\/eecircuit-engine/.test(
        bundleWithRelativeNpmImport,
      )
    expect(hasEecircuitImport).toBe(true)
  })

  test("transformJsDelivrImports fixes the relative import", () => {
    const input =
      'const{Simulation:t}=await import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm")'
    const output = transformJsDelivrImports(input)

    expect(output).toBe(
      'const{Simulation:t}=await import("https://cdn.jsdelivr.net/npm/@tscircuit/eecircuit-engine@1.7.4/+esm")',
    )
    expect(output).not.toContain('"/npm/')
  })

  test("blob URL with untransformed /npm/ import fails with module resolution error", async () => {
    // This reproduces the actual error:
    // "Cannot find module '/npm/@tscircuit/eecircuit-engine@1.7.4/+esm'"
    // which in browser manifests as:
    // "Error resolving module specifier '/npm/@tscircuit/eecircuit-engine@1.7.4/+esm'"
    const codeWithRelativeImport = `
      export default async function test() {
        const { Simulation } = await import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm");
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
        /Cannot find module.*\/npm\/@tscircuit\/eecircuit-engine/,
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  test("blob URL with transformed /npm/ import resolves to correct jsdelivr URL", async () => {
    // After transformation, the import points to the full jsdelivr URL
    const codeWithRelativeImport = `
      export default async function test() {
        const { Simulation } = await import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm");
        return Simulation;
      }
    `

    const transformedCode = transformJsDelivrImports(codeWithRelativeImport)

    // Verify the transformation happened
    expect(transformedCode).toContain(
      "https://cdn.jsdelivr.net/npm/@tscircuit/eecircuit-engine",
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

  test("verify the CDN code transformation produces valid absolute URLs", () => {
    const transformedCode = transformJsDelivrImports(
      bundleWithRelativeNpmImport,
    )

    // Verify no relative /npm/ imports remain
    expect(transformedCode).not.toMatch(/import\s*\(\s*["']\/npm\//)
    expect(transformedCode).not.toMatch(/from\s*["']\/npm\//)

    // Verify the imports are now absolute
    expect(transformedCode).toContain(
      "https://cdn.jsdelivr.net/npm/@tscircuit/eecircuit-engine",
    )
  })

  test("absolute CDN urls are left unchanged", () => {
    expect(transformJsDelivrImports(bundleWithAbsoluteJscdnImport)).toBe(
      bundleWithAbsoluteJscdnImport,
    )
  })
})
