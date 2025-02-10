import { createCircuitWebWorker } from "lib"
import { expect, test } from "bun:test"

// TODO skip b/c uses network
test("example7-cloud-autorouting", async () => {
  const circuitWebWorker = await createCircuitWebWorker({})

  await circuitWebWorker.execute(
    `
circuit.add(
  <board width="10mm" height="10mm" autorouter={{
    serverCacheEnabled: true
  }}>
    <subcircuit autorouter={{ serverCacheEnabled: true }}>
      <resistor
        resistance="1k"
        footprint="0402"
        name="R1"
        schX={3}
        pcbX={3}
      />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        schX={-3}
        pcbX={-3}
      />
      <trace from=".R1 > .pin1" to=".C1 > .pin1" />
    </subcircuit>
  </board>
)
  `,
    { name: "eval-example7" },
  )

  await circuitWebWorker.renderUntilSettled()

  const circuitJson = await circuitWebWorker.getCircuitJson()

  expect(circuitJson).toBeDefined()
})
