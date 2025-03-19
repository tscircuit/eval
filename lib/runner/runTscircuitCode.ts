import { CircuitRunner } from "./CircuitRunner"

export async function runTscircuitCode(
  filesystemOrCodeString: Record<string, string> | string,
  opts?: Omit<Parameters<CircuitRunner["executeWithFsMap"]>[0], "fsMap">,
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

  const circuitRunner = new CircuitRunner()

  await circuitRunner.executeWithFsMap({
    fsMap: filesystem,
    ...opts,
  })

  await circuitRunner.renderUntilSettled()

  return await circuitRunner.getCircuitJson()
}
