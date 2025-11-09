import { CircuitRunner } from "lib/runner/CircuitRunner"
import { expect, test } from "bun:test"
import type { SourceComponentBase } from "circuit-json"
import { getPlatformConfig } from "lib/getPlatformConfig"

test("partsEngine can be disabled via projectConfig", async () => {
  const runner = new CircuitRunner({
    projectConfig: {
      partsEngineDisabled: true,
    },
  })

  await runner.execute(`
    circuit.add(
      <board>
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
  `)

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()

  const source_component = circuitJson.find(
    (el) => el.type === "source_component",
  ) as SourceComponentBase
  expect(source_component).toBeDefined()
  expect(source_component.supplier_part_numbers).toBeUndefined()

  await runner.kill()
})

test("partsEngine can be disabled via platform config", async () => {
  const runner = new CircuitRunner({
    platform: {
      ...getPlatformConfig(),
      partsEngineDisabled: true,
    },
  })

  await runner.execute(`
    circuit.add(
      <board>
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    )
  `)

  await runner.renderUntilSettled()

  const circuitJson = await runner.getCircuitJson()

  const source_component = circuitJson.find(
    (el) => el.type === "source_component",
  ) as SourceComponentBase

  expect(source_component).toBeDefined()
  expect(source_component.supplier_part_numbers).toBeUndefined()

  await runner.kill()
})
