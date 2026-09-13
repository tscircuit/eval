import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { RootCircuit } from "@tscircuit/core"
const { getPlatformConfig } = (await import(
  new URL("../dist/platform-config/getPlatformConfig.js", import.meta.url).href
)) as typeof import("../lib/getPlatformConfig")
const { CircuitRunner } = (await import(
  new URL("../dist/eval/index.js", import.meta.url).href
)) as typeof import("../lib/runner")
const { CircuitRunner: LibraryCircuitRunner } = (await import(
  new URL("../dist/lib/index.js", import.meta.url).href
)) as typeof import("../lib/runner")

const code = `circuit.add(<board width="10mm" height="10mm" routingDisabled fabricatorPreset="jlcpcb_economy">
  <via name="small" pcbX={-2} holeDiameter="0.25mm" outerDiameter="0.6mm" fromLayer="top" toLayer="bottom" />
  <via name="boundary" pcbX={0} holeDiameter="0.3mm" outerDiameter="0.6mm" fromLayer="top" toLayer="bottom" />
  <via name="large" pcbX={2} holeDiameter="0.4mm" outerDiameter="0.7mm" fromLayer="top" toLayer="bottom" />
</board>)`

for (const Runner of [CircuitRunner, LibraryCircuitRunner]) {
  const runner = new Runner()
  try {
    await runner.execute(code)
    await runner.renderUntilSettled()
    const json = await runner.getCircuitJson()
    const warnings = json.filter(
      (element) => element.type === "pcb_fabricator_extra_charge_warning",
    )
    const smallVia = json.find(
      (element) => element.type === "pcb_via" && element.hole_diameter === 0.25,
    )
    assert(smallVia?.type === "pcb_via")
    assert.equal(warnings.length, 1)
    assert.deepEqual(warnings[0].pcb_via_ids, [smallVia.pcb_via_id])
  } finally {
    await runner.kill()
  }
}

const platform = getPlatformConfig()
assert.equal(typeof platform.fabricatorEngine?.runDrcChecks, "function")
const circuit = new RootCircuit({ platform })
assert.equal(circuit.platform?.fabricatorEngine, platform.fabricatorEngine)

for (const path of [
  "dist/platform-config/getPlatformConfig.js",
  "dist/eval/index.js",
  "dist/lib/index.js",
  "dist/webworker/entrypoint.js",
]) {
  const output = await readFile(path, "utf8")
  assert(
    output.includes("minimumViaHoleDiameterWithoutExtraCharge"),
    `${path} must contain the check implementation`,
  )
  assert(
    !/(?:from\s*|import\s*\(|require\s*\()\s*["']@tscircuit\/fabricator-drc["']/.test(
      output,
    ),
    `${path} must bundle the fabricator engine`,
  )
}

console.log("Packaged fabricator engine checks passed")
