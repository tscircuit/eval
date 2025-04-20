import { runTscircuitCode } from "./runTscircuitCode"

export const runTscircuitModule = async (module: string) => {
  if (!module.startsWith("@")) {
    module = `@tsci/${module.replace(/\//, ".")}`
  }
  const circuitJson = await runTscircuitCode({
    "user-code.tsx": `export * from "${module}";`,
  })
  return circuitJson
}
