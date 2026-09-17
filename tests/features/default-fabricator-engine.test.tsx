import { expect, test } from "bun:test"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import { getPlatformConfig } from "lib/getPlatformConfig"

const boardCode = (preset?: string) => `
  circuit.add(<board width="10mm" height="10mm" routingDisabled
    ${preset ? `fabricatorPreset="${preset}"` : ""}>
    <via name="small" pcbX={-2} holeDiameter="0.25mm" outerDiameter="0.6mm" fromLayer="top" toLayer="bottom" />
    <via name="boundary" pcbX={0} holeDiameter="0.3mm" outerDiameter="0.6mm" fromLayer="top" toLayer="bottom" />
    <via name="large" pcbX={2} holeDiameter="0.4mm" outerDiameter="0.7mm" fromLayer="top" toLayer="bottom" />
  </board>)
`

test("default eval platform emits via surcharge warnings for all JLCPCB presets", async () => {
  for (const preset of [
    "jlcpcb_economy",
    "jlcpcb_standard",
    "jlcpcb_economy_20260912",
    "jlcpcb_standard_20260912",
  ] as const) {
    const runner = new CircuitRunner()
    try {
      await runner.execute(boardCode(preset))
      await runner.renderUntilSettled()
      const json = await runner.getCircuitJson()
      const warnings = json.filter(
        (element) => element.type === "pcb_fabricator_extra_charge_warning",
      )
      const vias = json.filter((element) => element.type === "pcb_via")
      expect(vias).toHaveLength(3)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].fabricator_preset).toBe(preset)
      expect(warnings[0].pcb_via_ids).toEqual(
        vias
          .filter((via) => via.hole_diameter < 0.3)
          .map((via) => via.pcb_via_id),
      )
      expect(warnings[0].pcb_via_ids).toHaveLength(1)
      expect(warnings[0].message).toContain("0.3 mm")

      // The packaged engine must share the caller's Circuit JSON types so
      // newer records coexist with its via checks.
      const circuitJson = [
        ...json,
        {
          type: "source_bus" as const,
          source_bus_id: "source_bus_0",
          source_trace_ids: [],
        },
      ]
      const originalJson = structuredClone(circuitJson)
      const diagnostics =
        await getPlatformConfig().fabricatorEngine!.runDrcChecks({
          circuitJson,
          fabricatorPreset: preset,
          pcbBoardId: json.find((element) => element.type === "pcb_board")!
            .pcb_board_id,
        })
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0]).toMatchObject({
        type: "pcb_fabricator_extra_charge_warning",
        fabricator_preset: preset,
        pcb_via_ids: warnings[0].pcb_via_ids,
      })
      expect(circuitJson).toEqual(originalJson)
    } finally {
      await runner.kill()
    }
  }
})

test("default fabricator checks respect omitted presets and DRC disable flags", async () => {
  for (const config of [
    { platform: {}, preset: undefined },
    { platform: { drcChecksDisabled: true }, preset: "jlcpcb_economy" },
    { platform: { pcbDisabled: true }, preset: "jlcpcb_economy" },
  ]) {
    const runner = new CircuitRunner({ platform: config.platform })
    try {
      await runner.execute(boardCode(config.preset))
      await runner.renderUntilSettled()
      expect(
        (await runner.getCircuitJson()).filter(
          (element) => element.type === "pcb_fabricator_extra_charge_warning",
        ),
      ).toEqual([])
    } finally {
      await runner.kill()
    }
  }
})

test("a custom fabricator provider overrides the packaged default", async () => {
  let calls = 0
  const fabricatorEngine = {
    runDrcChecks() {
      calls++
      return []
    },
  }
  expect(getPlatformConfig({ fabricatorEngine }).fabricatorEngine).toBe(
    fabricatorEngine,
  )
  const runner = new CircuitRunner({ platform: { fabricatorEngine } })
  try {
    await runner.execute(boardCode("jlcpcb_economy"))
    await runner.renderUntilSettled()
    expect(calls).toBe(1)
    expect(
      (await runner.getCircuitJson()).filter(
        (element) => element.type === "pcb_fabricator_extra_charge_warning",
      ),
    ).toEqual([])
  } finally {
    await runner.kill()
  }
})
