import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib/index"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("one KiCad fab reference is hidden by default and one is shown via pcbSx visibility", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    verbose: true,
  })

  try {
    await circuitWebWorker.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          circuit.add(
            <board>
              <chip
                footprint="kicad:Resistor_SMD.pretty/R_0402_1005Metric"
                name="U2"
              />
              <chip
                footprint="kicad:Resistor_SMD.pretty/R_0402_1005Metric"
                name="U3"
                pcbSx={{
                  "& fabricationnotetext": {
                    visibility: "visible",
                  },
                }}
              />
            </board>
          )
        `,
      },
    })

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()
    expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
  } finally {
    await circuitWebWorker.kill()
  }
})
