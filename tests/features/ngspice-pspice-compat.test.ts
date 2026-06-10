import { expect, test } from "bun:test"
import { getPlatformConfig } from "lib/getPlatformConfig/getPlatformConfig"

test("platform ngspice engine enables PSPICE compatibility", async () => {
  const platformConfig = getPlatformConfig()
  const spice = `
.temp 75
V1 in 0 5
R1 in out 1k TC=0.01,0.001
C1 out 0 1u IC=0
.print tran v(out)
.tran 1u 20u
.end
`

  const result = await platformConfig.spiceEngineMap!.ngspice!.simulate(spice)
  const graphs = result.simulationResultCircuitJson

  expect(graphs).toHaveLength(1)
  expect(graphs[0]!.name).toBe("out")
  expect(graphs[0]!.voltage_levels.length).toBeGreaterThan(0)
})
