export const enhanceRootCircuitHasNoChildrenError = (
  error: unknown,
  entrypoint?: string,
) => {
  if (
    error instanceof Error &&
    entrypoint &&
    (error.message.includes("RootCircuit has no children") ||
      error.message.includes("IsolatedCircuit has no children")) &&
    !error.message.includes('"entrypoint":')
  ) {
    const entrypointMessage = entrypoint.startsWith("./")
      ? entrypoint.slice(2)
      : entrypoint
    error.message = `${error.message}. "entrypoint": "${entrypointMessage}" is set in the runner configuration, entrypoints must contain "circuit.add(...)", you might be looking to use mainComponentPath instead if your file exports a component.`
  }

  return error
}
