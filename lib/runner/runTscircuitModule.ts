import { runTscircuitCode } from "./runTscircuitCode"

export const runTscircuitModule = async (
  module: string,
  props?: Record<string, any>,
) => {
  if (!module.startsWith("@")) {
    module = `@tsci/${module.replace(/\//, ".")}`
  }
  const circuitJson = await runTscircuitCode(
    {
      // TODO handle exports that are not the default export by scanning
      // otherExports for components
      "user-code.tsx": `
    import Module, * as otherExports from "${module}";

    export default Module;
    `,
    },
    {
      mainComponentProps: props,
    },
  )
  return circuitJson
}
