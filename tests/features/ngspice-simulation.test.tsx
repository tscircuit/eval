import { test, expect } from "bun:test"
import { createCircuitWebWorker } from "lib"
import createNgspiceSpiceEngine from "@tscircuit/ngspice-spice-engine"

test(
  "spice-analysis with the ngspice engine for a switch circuit",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      platform: {
        spiceEngineMap: {
          ngspice: await createNgspiceSpiceEngine(),
        },
      },
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    })

    try {
      await circuitWebWorker.execute(`
    circuit.add(
      <board schMaxTraceDistance={10} routingDisabled>
        <voltagesource name="V1" voltage="5V" />
        <switch name="SW1" spst simSwitchFrequency="1kHz" />
        <trace from=".V1 > .terminal1" to=".SW1 > .pin1" />
        <resistor
          name="R1"
          resistance="1k"
          footprint="0402"
          connections={{ pin1: ".SW1 > .pin2", pin2: ".V1 > .terminal2" }}
        />
        <voltageprobe connectsTo={".R1 > .pin1"} />
        <analogsimulation
          duration="4ms"
          timePerStep="10us"
          spiceEngine="ngspice"
        />
      </board>
    )
  `)

      await circuitWebWorker.renderUntilSettled()

      const circuitJson = await circuitWebWorker.getCircuitJson()

      expect(
        circuitJson.some(
          (el) => el.type === "simulation_transient_voltage_graph",
        ),
      ).toBe(true)
    } finally {
      await circuitWebWorker.kill()
    }
  },
  { timeout: 20000 },
)

test(
  "Choosing ngspice when it's not in the platform config",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    })

    try {
      await circuitWebWorker.execute(`
        circuit.add(
          <board schMaxTraceDistance={10} routingDisabled>
            <voltagesource name="V1" voltage="5V" />
            <switch name="SW1" spst simSwitchFrequency="1kHz" />
            <trace from=".V1 > .terminal1" to=".SW1 > .pin1" />
            <resistor
              name="R1"
              resistance="1k"
              footprint="0402"
              connections={{ pin1: ".SW1 > .pin2", pin2: ".V1 > .terminal2" }}
            />
            <voltageprobe connectsTo={".R1 > .pin1"} />
            <analogsimulation
              duration="4ms"
              timePerStep="10us"
              spiceEngine="ngspice"
            />
          </board>
        )
      `)

      expect(circuitWebWorker.renderUntilSettled()).rejects.toThrow(
        'SPICE engine "ngspice" not found in platform config. Available engines: []',
      )
    } finally {
      await circuitWebWorker.kill()
    }
  },
  { timeout: 20000 },
)
