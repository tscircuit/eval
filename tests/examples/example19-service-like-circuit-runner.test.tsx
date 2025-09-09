import { CircuitRunner } from "lib/runner/CircuitRunner"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("example19-service-like-browser-preview", async () => {
  // Simulate the service code pattern with platform config
  const worker = new CircuitRunner({
    platform: getPlatformConfig(), // This is the key - pass platform config
  })

  // Simulate user code that uses kicad footprints
  const userCode = `
    export default () => (
      <board>
        <resistor name="R1" resistance="1k" footprint="kicad:Resistor_SMD.pretty/R_0402_1005Metric" pcbX={-2} />
        <capacitor name="C1" capacitance="100uF" footprint="0402" pcbX={2} />
        <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      </board>
    )
  `

  // Execute with fsMap similar to service code
  await worker.executeWithFsMap({
    fsMap: {
      "entrypoint.tsx": `
        import UserComponents from "./UserCode.tsx";
        
        const hasBoard = ${userCode.includes("<board").toString()};

        circuit.add(
          hasBoard ? (
            <UserComponents />
          ) : (
            <board>
              <UserComponents name="U1" />
            </board>
          )
        );
      `,
      "UserCode.tsx": userCode,
    },
    entrypoint: "entrypoint.tsx",
  })

  await worker.renderUntilSettled()

  const circuitJson = await worker.getCircuitJson()

  // Verify the circuit was created successfully
  expect(circuitJson).toBeDefined()
  expect(Array.isArray(circuitJson)).toBe(true)
  expect(circuitJson.length).toBeGreaterThan(0)

  // Check that we have the expected elements
  const pcb_trace = circuitJson.filter((el: any) => el.type === "pcb_trace")
  expect(pcb_trace).toBeDefined()
  expect(pcb_trace.length).toBe(1)

  // Check that kicad footprint was processed (should have footprint elements)
  const footprintElements = circuitJson.filter(
    (el: any) =>
      el.type === "pcb_silkscreen_text" ||
      el.type === "pcb_pad" ||
      el.type === "pcb_silkscreen_line",
  )
  expect(footprintElements.length).toBeGreaterThan(0)

  // Generate SVG to verify visual output
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )

  await worker.kill()
})
