import { expect, test } from "bun:test"
import { CircuitRunner, getPlatformConfig } from "lib/index"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import {
  customSymbolSizingCode,
  expectCustomSymbolSizing,
} from "tests/fixtures/custom-symbol-sizing"

test("CircuitRunner preserves round custom symbols and local viewbox ports", async () => {
  const runner = new CircuitRunner({ platform: getPlatformConfig() })
  try {
    await runner.executeWithFsMap({
      entrypoint: "main.tsx",
      fsMap: { "main.tsx": customSymbolSizingCode },
    })
    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()
    expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
    expectCustomSymbolSizing(circuitJson)
  } finally {
    await runner.kill()
  }
})
