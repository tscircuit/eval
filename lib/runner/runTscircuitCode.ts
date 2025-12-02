import { CircuitRunner } from "./CircuitRunner"

export async function runTscircuitCode(
  filesystemOrCodeString: Record<string, string> | string,
  opts?: Omit<
    Parameters<CircuitRunner["executeWithFsMap"]>[0],
    "fsMap" | "fs"
  > &
    Partial<
      Pick<Parameters<CircuitRunner["executeWithFsMap"]>[0], "fsMap" | "fs">
    >,
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

  const executeOptions: Parameters<CircuitRunner["executeWithFsMap"]>[0] = {
    ...opts,
  }

  if (!executeOptions.fs && !executeOptions.fsMap) {
    executeOptions.fsMap = filesystem
  }

  await circuitRunner.executeWithFsMap(executeOptions)

  await circuitRunner.renderUntilSettled()

  return await circuitRunner.getCircuitJson()
}
