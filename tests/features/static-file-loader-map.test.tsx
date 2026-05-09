import { expect, test } from "bun:test"
import {
  CircuitRunner,
  createCircuitWebWorker,
  getPlatformConfig,
} from "lib/index"

test("platformConfig.staticFileLoaderMap loads static file imports", async () => {
  const platform = getPlatformConfig()
  let loaderCallCount = 0
  const runner = new CircuitRunner({
    platform: {
      ...platform,
      staticFileLoaderMap: {
        ...platform.staticFileLoaderMap,
        txt: async (fileContent) => {
          loaderCallCount += 1
          const text = String(fileContent)
          return {
            __esModule: true,
            default: `loaded:${text}`,
            messageLength: text.length,
          }
        },
      },
    },
  })

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import message, { messageLength } from "./message.txt"

        if (message !== "loaded:hello") {
          throw new Error("Unexpected message: " + message)
        }

        if (messageLength !== 5) {
          throw new Error("Unexpected messageLength: " + messageLength)
        }

        circuit.add(<board width="10mm" height="10mm" />)
      `,
      "message.txt": "hello",
    },
  })

  await runner.renderUntilSettled()
  expect(loaderCallCount).toBe(1)
  await runner.kill()
})

test("default platformConfig defines a kicad_pcb static file loader", async () => {
  const platform = getPlatformConfig()
  expect(typeof platform.staticFileLoaderMap?.kicad_pcb).toBe("function")
})

test("platformConfig.staticFileLoaderMap can override kicad_pcb imports", async () => {
  const platform = getPlatformConfig()
  const runner = new CircuitRunner({
    platform: {
      ...platform,
      staticFileLoaderMap: {
        ...platform.staticFileLoaderMap,
        kicad_pcb: async (fileContent) => ({
          __esModule: true,
          default: `custom:${fileContent}`,
        }),
      },
    },
  })

  await runner.executeWithFsMap({
    entrypoint: "index.tsx",
    fsMap: {
      "index.tsx": `
        import boardValue from "./board.kicad_pcb"

        if (boardValue !== "custom:not real kicad") {
          throw new Error("Unexpected boardValue: " + boardValue)
        }

        circuit.add(<board width="10mm" height="10mm" />)
      `,
      "board.kicad_pcb": "not real kicad",
    },
  })

  await runner.renderUntilSettled()
  await runner.kill()
})

test("platformConfig.staticFileLoaderMap works through createCircuitWebWorker", async () => {
  let loaderCallCount = 0
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    platform: {
      staticFileLoaderMap: {
        txt: async (fileContent) => {
          loaderCallCount += 1
          return {
            __esModule: true,
            default: `worker:${fileContent}`,
          }
        },
      },
    },
  })

  try {
    await circuitWebWorker.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          import message from "./message.txt"

          if (message !== "worker:hello") {
            throw new Error("Unexpected worker message: " + message)
          }

          circuit.add(<board width="10mm" height="10mm" />)
        `,
        "message.txt": "hello",
      },
    })

    await circuitWebWorker.renderUntilSettled()
    expect(loaderCallCount).toBe(1)
  } finally {
    await circuitWebWorker.kill()
  }
})
