import { expect, test } from "bun:test"
import { CircuitRunner, createCircuitWebWorker } from "lib/index"

test(
  "tscircuit.config.ts can import @tscircuit/ngspice-spice-engine with top-level await even when not declared in package.json (cli#5666)",
  async () => {
    const runner = new CircuitRunner()

    try {
      await runner.executeWithFsMap({
        mainComponentPath: "index.circuit.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "ngspice-dev-repro",
            dependencies: {
              tscircuit: "^0.0.3062",
            },
          }),
          "tscircuit.config.ts": `
import createNgspiceSpiceEngine from "@tscircuit/ngspice-spice-engine"
export default {
  platformConfig: {
    spiceEngineMap: {
      ngspice: await createNgspiceSpiceEngine(),
    },
  },
}
`,
          "index.circuit.tsx": `
export default () => (
  <board width="20mm" height="15mm" routingDisabled>
    <voltagesource name="V1" voltage="5V" />
    <resistor name="R1" resistance="1k" connections={{ pin1: ".V1 > .pin1" }} />
    <capacitor name="C1" capacitance="10uF" connections={{ pin1: ".R1 > .pin2", pin2: ".V1 > .pin2" }} />
    <voltageprobe name="VCAP" connectsTo=".C1 > .pin1" />
    <analogsimulation duration="50ms" timePerStep="0.5ms" spiceEngine="ngspice" />
  </board>
)
`,
        },
      })

      await runner.renderUntilSettled()
      const circuitJson = await runner.getCircuitJson()
      expect(
        circuitJson.some(
          (el) => el.type === "simulation_transient_voltage_graph",
        ),
      ).toBe(true)
    } finally {
      await runner.kill()
    }
  },
  { timeout: 25000 },
)

test(
  "tscircuit.config.ts lazy ngspice wrapper works inside createCircuitWebWorker (cli#5666)",
  async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    })

    try {
      await worker.executeWithFsMap({
        mainComponentPath: "index.circuit.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "ngspice-lazy-repro",
            dependencies: {},
          }),
          "tscircuit.config.ts": `
import createNgspiceSpiceEngine from "@tscircuit/ngspice-spice-engine"
let engine: ReturnType<typeof createNgspiceSpiceEngine> | undefined
export default {
  platformConfig: {
    spiceEngineMap: {
      ngspice: {
        simulate: async (spice: string) => {
          engine ??= createNgspiceSpiceEngine()
          return (await engine).simulate(spice)
        },
      },
    },
  },
}
`,
          "index.circuit.tsx": `
export default () => (
  <board width="20mm" height="15mm" routingDisabled>
    <voltagesource name="V1" voltage="5V" />
    <resistor name="R1" resistance="1k" connections={{ pin1: ".V1 > .pin1" }} />
    <capacitor name="C1" capacitance="10uF" connections={{ pin1: ".R1 > .pin2", pin2: ".V1 > .pin2" }} />
    <voltageprobe name="VCAP" connectsTo=".C1 > .pin1" />
    <analogsimulation duration="10ms" timePerStep="0.5ms" spiceEngine="ngspice" />
  </board>
)
`,
        },
      })

      await worker.renderUntilSettled()
      const circuitJson = await worker.getCircuitJson()
      expect(
        circuitJson.some(
          (el) => el.type === "simulation_transient_voltage_graph",
        ),
      ).toBe(true)
    } finally {
      await worker.kill()
    }
  },
  { timeout: 25000 },
)

test(
  "dynamic import() of runtime blob: URLs inside evaluated node_modules is preserved instead of rewritten to require() (cli#5666)",
  async () => {
    const runner = new CircuitRunner()

    try {
      await runner.executeWithFsMap({
        mainComponentPath: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "blob-dynamic-import-repro",
            dependencies: {
              "custom-blob-loader": "1.0.0",
            },
          }),
          "node_modules/custom-blob-loader/package.json": JSON.stringify({
            name: "custom-blob-loader",
            main: "dist/index.js",
          }),
          "node_modules/custom-blob-loader/dist/index.js": `
export const loadFromBlob = async () => {
  const blobUrl = URL.createObjectURL(
    new Blob(["export const resistanceValue = '4.7k';"], {
      type: "text/javascript",
    }),
  )
  try {
    return await import(blobUrl)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
`,
          "index.tsx": `
import { loadFromBlob } from "custom-blob-loader"
const loaded = await loadFromBlob()
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor name="R1" resistance={loaded.resistanceValue} footprint="0402" />
  </board>
)
`,
        },
      })

      await runner.renderUntilSettled()
      const circuitJson = await runner.getCircuitJson()
      const r1 = circuitJson.find(
        (el) => el.type === "source_component" && el.name === "R1",
      ) as any
      expect(r1?.resistance).toBe(4700)
    } finally {
      await runner.kill()
    }
  },
  { timeout: 15000 },
)
