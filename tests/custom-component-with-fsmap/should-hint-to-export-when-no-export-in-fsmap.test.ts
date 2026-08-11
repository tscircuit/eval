import { runTscircuitCode } from "lib/runner"
import { expect, test } from "bun:test"

test("should hint to export a component when the fsMap file has no export", async () => {
  const run = runTscircuitCode({
    "index.tsx": `
      <board width="60mm" height="40mm">
        <resistor resistance="1k" footprint="0402" name="R1" />
      </board>
    `,
  })

  await expect(run).rejects.toThrow(
    'No component was exported from "index.tsx"',
  )
})
