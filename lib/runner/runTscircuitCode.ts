import { CircuitRunner } from "./CircuitRunner"
import type { CircuitRunnerConfiguration } from "lib/shared/types"

export async function runTscircuitCode(
  filesystemOrCodeString: Record<string, string> | string,
  opts?: Omit<Parameters<CircuitRunner["executeWithFsMap"]>[0], "fsMap"> & {
    /** Session token for authenticating with the tscircuit npm registry */
    tscircuitSessionToken?: string
  },
) {
  if (
    typeof filesystemOrCodeString === "string" &&
    !filesystemOrCodeString.includes("export")
  ) {
    throw new Error(
      `The "export" keyword wasn't found in your provided code. You need to export a component in your code, e.g.\n\nexport default () => (\n  <resistor name="R1" resistance="1k" />\n)`,
    )
  }
  const filesystem =
    typeof filesystemOrCodeString === "string"
      ? { "user-code.tsx": filesystemOrCodeString }
      : filesystemOrCodeString

  const runnerConfig: Partial<CircuitRunnerConfiguration> = {}
  if (opts?.tscircuitSessionToken) {
    runnerConfig.tscircuitSessionToken = opts.tscircuitSessionToken
  }

  const circuitRunner = new CircuitRunner(runnerConfig)

  await circuitRunner.executeWithFsMap({
    fsMap: filesystem,
    ...opts,
  })

  await circuitRunner.renderUntilSettled()

  return await circuitRunner.getCircuitJson()
}
