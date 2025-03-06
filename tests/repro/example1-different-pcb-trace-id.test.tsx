import { RootCircuit } from "@tscircuit/core"
import { expect, test } from "bun:test"

test("example1: different pcb trace id format from core", async () => {
  const circuit = new RootCircuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="10k" footprint="0402" pcbX={-2} schX={-2} />
      <led name="LED1" footprint="0402" pcbX={2} schX={2} />
      <trace from=".R1 > .pin1" to=".LED1 > .anode" />
    </board>
  )

  await circuit.renderUntilSettled()

  const source_trace = circuit.db.source_trace.list()
  expect(source_trace).toBeDefined()
  expect(source_trace[0].source_trace_id).toBe("source_trace_0")

  const pcb_trace = circuit.db.pcb_trace.list()
  expect(pcb_trace).toBeDefined()
  expect(pcb_trace[0].pcb_trace_id).toBe("source_trace_0")

  // For hover to work, we need both of these to be same
  expect(source_trace[0].source_trace_id).toBe(pcb_trace[0].pcb_trace_id)
})
