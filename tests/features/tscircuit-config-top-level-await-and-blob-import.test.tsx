import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"
import { loadTscircuitConfig } from "lib/runner/loadTscircuitConfig"

test("loadTscircuitConfig supports top-level await and dynamic blob:/data: ESM imports", async () => {
  const fsMap: Record<string, string> = {
    "package.json": JSON.stringify({
      name: "test-ngspice-config",
      dependencies: {
        "@tscircuit/ngspice-spice-engine": "^0.0.20",
      },
    }),
    "node_modules/@tscircuit/ngspice-spice-engine/package.json": JSON.stringify(
      {
        name: "@tscircuit/ngspice-spice-engine",
        main: "./dist/index.js",
      },
    ),
    "node_modules/@tscircuit/ngspice-spice-engine/dist/index.js": `
      export const createNgspiceSpiceEngine = async () => {
        const blobSource = [
          "export default function runKernel(netlist) { return 'ok:' + netlist.trim().split('\\\\n')[0] }",
          "export const engineVersion = '1.7.6'",
        ].join("\\n")
        const moduleUrl = URL.createObjectURL(
          new Blob([blobSource], { type: "text/javascript" }),
        )
        const dataUrl =
          "data:text/javascript," +
          encodeURIComponent("export const multiplier = 2")

        try {
          const loadedBlob = await import(moduleUrl)
          const loadedData = await import(dataUrl)
          return {
            engineVersion: loadedBlob.engineVersion,
            multiplier: loadedData.multiplier,
            simulate: async (spiceString) => ({
              engineResult: loadedBlob.default(spiceString),
              simulationResultCircuitJson: [],
            }),
          }
        } finally {
          URL.revokeObjectURL(moduleUrl)
        }
      }
    `,
    "tscircuit.config.ts": `
      import { createNgspiceSpiceEngine } from "@tscircuit/ngspice-spice-engine"

      export default {
        platformConfig: {
          spiceEngineMap: {
            ngspice: await createNgspiceSpiceEngine(),
          },
        },
      }
    `,
  }

  const config = await loadTscircuitConfig(fsMap, {} as any)
  expect(config).not.toBeNull()

  const ngspice = config?.platformConfig?.spiceEngineMap?.ngspice as any
  expect(ngspice).toBeDefined()
  expect(ngspice.engineVersion).toBe("1.7.6")
  expect(ngspice.multiplier).toBe(2)

  const simOut = await ngspice.simulate("* test deck\n.end")
  expect(simOut.engineResult).toBe("ok:* test deck")
})

test(
  "CircuitWebWorker executes analog simulation with top-level await + blob: import spiceEngine in tscircuit.config.ts",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    })

    try {
      await circuitWebWorker.executeWithFsMap({
        entrypoint: "index.tsx",
        fsMap: {
          "package.json": JSON.stringify({
            name: "test-worker-ngspice",
            dependencies: {
              "@tscircuit/ngspice-spice-engine": "^0.0.20",
            },
          }),
          "node_modules/@tscircuit/ngspice-spice-engine/package.json":
            JSON.stringify({
              name: "@tscircuit/ngspice-spice-engine",
              main: "./dist/index.js",
            }),
          "node_modules/@tscircuit/ngspice-spice-engine/dist/index.js": `
          export const createNgspiceSpiceEngine = async () => {
            const source = "export default (spice) => ({ ok: spice.length > 0 })"
            const blobUrl = URL.createObjectURL(
              new Blob([source], { type: "text/javascript" }),
            )
            const mod = await import(blobUrl)
            URL.revokeObjectURL(blobUrl)
            return {
              simulate: async (spiceString) => {
                const check = mod.default(spiceString)
                if (!check.ok) throw new Error("Empty SPICE string")
                return {
                  simulationResultCircuitJson: [
                    {
                      type: "simulation_transient_voltage_graph",
                      simulation_transient_voltage_graph_id: "graph_ngspice_1",
                      timestamps_ms: [0, 1],
                      voltage_levels: [[0, 3.3]],
                      time_per_step: 1,
                      start_time_ms: 0,
                      end_time_ms: 1,
                    },
                  ],
                }
              },
            }
          }
        `,
          "tscircuit.config.ts": `
          import { createNgspiceSpiceEngine } from "@tscircuit/ngspice-spice-engine"

          export default {
            platformConfig: {
              spiceEngineMap: {
                custom_ngspice: await createNgspiceSpiceEngine(),
              },
            },
          }
        `,
          "index.tsx": `
          circuit.add(
            <board schMaxTraceDistance={10} routingDisabled>
              <voltagesource name="V1" voltage="3.3V" />
              <resistor
                name="R1"
                resistance="1k"
                footprint="0402"
                connections={{ pin1: ".V1 > .terminal1", pin2: ".V1 > .terminal2" }}
              />
              <voltageprobe connectsTo={".R1 > .pin1"} />
              <analogsimulation duration="1ms" timePerStep="0.5ms" spiceEngine="custom_ngspice" />
            </board>
          )
        `,
        },
      })

      await circuitWebWorker.renderUntilSettled()
      const circuitJson = await circuitWebWorker.getCircuitJson()

      const simErrors = circuitJson.filter((el: any) =>
        String(el.type || "").includes("error"),
      )
      expect(simErrors).toEqual([])

      const graph = circuitJson.find(
        (el: any) => el.type === "simulation_transient_voltage_graph",
      ) as any
      expect(graph).toBeDefined()
      expect(graph.voltage_levels).toEqual([[0, 3.3]])
    } finally {
      await circuitWebWorker.kill()
    }
  },
  { timeout: 20000 },
)
