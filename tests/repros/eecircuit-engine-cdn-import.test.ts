import { describe, expect, test } from "bun:test"
import { transformJsDelivrImports } from "lib/utils/dynamically-load-dependency-with-cdn-backup"

/**
 * This test reproduces the error:
 * "simulation_unknown_experiment_error:Error resolving module specifier '/npm/@tscircuit/eecircuit-engine@1.7.4/+esm'"
 *
 * The issue occurs when:
 * 1. ngspice-spice-engine is loaded from jsdelivr CDN
 * 2. The CDN bundle contains: import("/npm/@tscircuit/eecircuit-engine@1.7.4/+esm")
 * 3. When loaded via blob URL, the browser resolves "/npm/..." relative to page origin
 *
 * This test verifies the CDN code contains the problematic import pattern
 * and that our transformation would fix it.
 *
 * NOTE: the deterministic unit tests below pin `transformJsDelivrImports` against
 * fixed inputs. The two live-CDN tests assert the *invariant* the transform
 * guarantees (no blob-unsafe relative `/npm/` imports remain) rather than the
 * exact shape of the external bundle — upstream `@tscircuit/ngspice-spice-engine`
 * now references eecircuit-engine via an absolute `jscdn.tscircuit.com` URL
 * instead of a jsDelivr-relative `import("/npm/...")`, so shape-specific
 * assertions against the live bundle are brittle and broke CI.
 */

describe("@tscircuit/eecircuit-engine CDN import issue", () => {
  test("ngspice-spice-engine CDN bundle references @tscircuit/eecircuit-engine", async () => {
    // Fetch the actual CDN bundle
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@tscircuit/ngspice-spice-engine/+esm",
    )
    expect(res.ok).toBe(true)

    const code = await res.text()

    // The bundle pulls in @tscircuit/eecircuit-engine. Historically it did so via a
    // jsDelivr-relative `import("/npm/...")` (the bug this repro captured); it now
    // ships an absolute `jscdn.tscircuit.com` URL. We only assert the dependency is
    // referenced here — the transform's blob-safety invariant is checked below.
    expect(code).toContain("@tscircuit/eecircuit-engine")
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

  test("transformJsDelivrImports leaves the live CDN bundle free of blob-unsafe /npm/ imports", async () => {
    // Fetch and transform the actual CDN code
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@tscircuit/ngspice-spice-engine/+esm",
    )
    const originalCode = await res.text()
    const transformedCode = transformJsDelivrImports(originalCode)

    // The invariant: no relative /npm/ imports remain. Such imports resolve
    // relative to the page origin under a blob: URL and fail; absolute CDN URLs
    // (jsDelivr or jscdn.tscircuit.com) are left untouched and load fine.
    expect(transformedCode).not.toMatch(/import\s*\(\s*["']\/npm\//)
    expect(transformedCode).not.toMatch(/from\s*["']\/npm\//)
  })
})
