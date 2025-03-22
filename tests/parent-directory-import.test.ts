import { resolveFilePath } from 'lib/runner/resolveFilePath';
import { describe, it, expect } from "bun:test"

describe("resolve parent directory imports", () => {
  const fsMap = {
    "src/components/Resistor.tsx": "src/components/Resistor.tsx",
    "src/components/Capacitor.tsx": "src/components/Capacitor.tsx",
    "src/core/types.ts": "src/core/types.ts",
    "src/utils/circuit-helpers.ts": "src/utils/circuit-helpers.ts",
    "src/schematics/basic-circuit.tsx": "src/schematics/basic-circuit.tsx",
  }

  it("should resolve a component in the same directory", () => {
    const result = resolveFilePath("Capacitor.tsx", fsMap, "src/components")
    expect(result).toBe("src/components/Capacitor.tsx")
  })

  it("should resolve core types from a component directory", () => {
    const result = resolveFilePath("../core/types.ts", fsMap, "src/components")
    expect(result).toBe("src/core/types.ts")
  })

  it("should resolve a component from a schematic directory", () => {
    const result = resolveFilePath("../components/Resistor.tsx", fsMap, "src/schematics")
    expect(result).toBe("src/components/Resistor.tsx")
  })

  it("should resolve circuit helpers from a component directory", () => {
    const result = resolveFilePath("../utils/circuit-helpers.ts", fsMap, "src/components")
    expect(result).toBe("src/utils/circuit-helpers.ts")
  })

  it("should return null for a non-existent component", () => {
    const result = resolveFilePath("LED.tsx", fsMap, "src/components")
    expect(result).toBeNull()
  })
})