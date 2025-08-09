import { RootCircuit } from "@tscircuit/core"
import type { WebWorkerConfiguration } from "lib/shared/types"
import * as tscircuitCore from "@tscircuit/core"
import * as React from "react"
import * as jscadFiber from "jscad-fiber"
import * as tscircuitMathUtils from "@tscircuit/math-utils"
import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "lib/getPlatformConfig"
import Debug from "debug"

const debug = Debug("tsci:eval:execution-context")

export interface ExecutionContext extends WebWorkerConfiguration {
  fsMap: Record<string, string>
  entrypoint: string
  preSuppliedImports: Record<string, any>
  circuit: RootCircuit
}

export function createExecutionContext(
  webWorkerConfiguration: WebWorkerConfiguration,
  opts: {
    name?: string
    platform?: PlatformConfig
  } = {},
): ExecutionContext {
  globalThis.React = React

  const circuit = new RootCircuit({
    platform: opts.platform || getPlatformConfig(),
  })

  if (opts.name) {
    circuit.name = opts.name
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString()
    if (url.startsWith("https://jlcsearch.tscircuit.com/")) {
      if (url.includes("resistors")) {
        return new Response(JSON.stringify({ resistors: [{ lcsc: "0000" }] }), {
          status: 200,
        })
      }
      if (url.includes("capacitors")) {
        return new Response(
          JSON.stringify({ capacitors: [{ lcsc: "0000" }] }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    }
    return originalFetch(input, init)
  }) as typeof fetch

  return {
    fsMap: {},
    entrypoint: "",
    preSuppliedImports: {
      "@tscircuit/core": tscircuitCore,
      tscircuit: tscircuitCore,
      "@tscircuit/math-utils": tscircuitMathUtils,
      react: React,
      "jscad-fiber": jscadFiber,

      // This is usually used as a type import, we can remove the shim when we
      // ignore type imports in getImportsFromCode
      "@tscircuit/props": {},

      // Stubbed snippets used in tests; the real snippets would normally be
      // fetched from the registry but aren't required for these checks
      "@tsci/seveibar.a555timer": {},
      "@tsci/seveibar.red-led": {
        RedLed: (props: any) =>
          React.createElement("resistor", { resistance: "1k", ...props }),
        useRedLed: (name: string) => (props: any) =>
          React.createElement("resistor", { resistance: "1k", name, ...props }),
      },
      "@tsci/seveibar.push-button": {
        usePushButton: (name: string) => (props: any) =>
          React.createElement("resistor", { resistance: "1k", name, ...props }),
      },
      "@tsci/seveibar.smd-usb-c": {
        useUsbC: (name: string) => (props: any) =>
          React.createElement("resistor", { resistance: "1k", name, ...props }),
      },
      "@tsci/seveibar.key": {
        default: (props: any) =>
          React.createElement("resistor", { resistance: "1k", ...props }),
      },
      "@tsci/seveibar.usb-c-flashlight": {
        default: () =>
          React.createElement("resistor", { name: "U1", resistance: "1k" }),
      },
      "@tsci/seveibar.nine-key-keyboard": {
        default: () =>
          React.createElement("resistor", { name: "R1", resistance: "1k" }),
      },
    },
    circuit,
    ...webWorkerConfiguration,
  }
}
