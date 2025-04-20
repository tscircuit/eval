import { runTscircuitCode } from "./runTscircuitCode"

export const runTscircuitModule = async (
  module: string,
  opts: { props?: Record<string, any>; exportName?: string } = {},
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

    let exportName = "${opts.exportName ?? ""}"

    if ((!Module || typeof Module !== "function") && !Boolean(exportName)) {
      exportName = Object.keys(otherExports).filter(key => key[0] === key[0].toUpperCase() && typeof otherExports[key] === "function")[0]
    }

    const defaultExport = exportName ? otherExports[exportName] : Module

    if (!defaultExport) {
      throw new Error(\`No export found for module "\${module}" (tried "\${exportName ?? "default"}")\`)
    }

    export default defaultExport;
    `,
    },
    {
      mainComponentProps: opts.props,
    },
  )
  return circuitJson
}
