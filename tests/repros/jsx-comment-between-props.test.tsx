import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"

test("allows JSX-style comments between component props", async () => {
  const runner = new CircuitRunner()

  await runner.execute(`
    export default () => {
      const $pinNames = Array.from({ length: 28 }, (_, index) =>
        "pin" + (index + 1),
      )

      return (
        <chip
          name="U1"
          connections={$pinNames.map((name) => ({ [name]: name }))}
          {/* Main controller — 28-pin SSOP */}
          footprint="ssop28"
          pinLabels={$pinNames}
        />
      )
    }
  `)
})

test("syntax errors include the source location and a code frame", async () => {
  const runner = new CircuitRunner()

  await expect(runner.execute("const value = ;")).rejects.toThrow(
    `Syntax error in "entrypoint.tsx" at 1:15: Unexpected token\n\n> 1 | const value = ;\n    |               ^`,
  )
})
