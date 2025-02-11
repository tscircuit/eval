# Example Circuit Transpilation and Execution Implementation

This is a sample implementation of transpiling and executing tscircuit code from
another project.

```tsx
import * as tscircuitCore from "@tscircuit/core"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import type { AnyCircuitElement } from "circuit-json"
import * as jscadFiber from "jscad-fiber"
import * as React from "react"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { safeCompileTsx } from "../use-compiled-tsx"
import { useSnippetsBaseApiUrl } from "../use-snippets-base-api-url"
import { constructCircuit } from "./construct-circuit"
import { evalCompiledJs } from "./eval-compiled-js"
import { getSyntaxError } from "@/lib/utils/getSyntaxError"

type RunTsxResult = {
  compiledModule: any
  message: string
  circuitJson: AnyCircuitElement[] | null
  compiledJs?: string
  isLoading: boolean
}

export const useRunTsx = ({
  code,
  userImports,
  type,
  isStreaming = false,
}: {
  code?: string
  userImports?: Record<string, object>
  type?: "board" | "footprint" | "package" | "model"
  isStreaming?: boolean
} = {}): RunTsxResult & {
  circuitJsonKey: string
  triggerRunTsx: () => void
  tsxRunTriggerCount: number
} => {
  type ??= "board"
  const [tsxRunTriggerCount, incTsxRunTriggerCount] = useReducer(
    (c) => c + 1,
    0
  )
  const [tsxResult, setTsxResult] = useState<RunTsxResult>({
    compiledModule: null,
    message: "",
    circuitJson: null,
    isLoading: false,
  })
  const apiBaseUrl = useSnippetsBaseApiUrl()
  const preSuppliedImportsRef = useRef<Record<string, any>>({})

  useEffect(() => {
    if (tsxRunTriggerCount === 0) return
    if (isStreaming) {
      setTsxResult({
        compiledModule: null,
        message: "",
        circuitJson: null,
        isLoading: false,
      })
    }
    if (!code) return
    const syntaxError = getSyntaxError(code)
    if (syntaxError) {
      setTsxResult({
        compiledModule: null,
        message: syntaxError,
        circuitJson: null,
        isLoading: false,
      })
      return
    }
    async function run() {
      setTsxResult({
        compiledModule: null,
        message: "",
        circuitJson: null,
        isLoading: true,
      })

      const userCodeTsciImports = getImportsFromCode(code!).filter((imp) =>
        imp.startsWith("@tsci/")
      )

      const preSuppliedImports: Record<string, any> =
        preSuppliedImportsRef.current

      for (const [importName, importValue] of Object.entries(
        userImports ?? {}
      )) {
        preSuppliedImports[importName] = importValue
      }

      const __tscircuit_require = (name: string) => {
        if (!preSuppliedImports[name]) {
          throw new Error(
            `Import "${name}" not found (imports available: ${Object.keys(
              preSuppliedImports
            ).join(",")})`
          )
        }
        return preSuppliedImports[name]
      }
      ;(globalThis as any).__tscircuit_require = __tscircuit_require
      preSuppliedImports["@tscircuit/core"] = tscircuitCore
      preSuppliedImports["react"] = React
      preSuppliedImports["jscad-fiber"] = jscadFiber
      globalThis.React = React

      async function addImport(importName: string, depth = 0) {
        if (!importName.startsWith("@tsci/")) return
        if (preSuppliedImports[importName]) return
        if (depth > 5) {
          console.log("Max depth for imports reached")
          return
        }

        const fullSnippetName = importName
          .replace("@tsci/", "")
          .replace(".", "/")
        const { snippet: importedSnippet, error } = await fetch(
          `${apiBaseUrl}/snippets/get?name=${fullSnippetName}`
        )
          .then((res) => res.json())
          .catch((e) => ({ error: e }))

        if (error) {
          console.error("Error fetching import", importName, error)
          return
        }

        const { compiled_js, code } = importedSnippet

        const importNames = getImportsFromCode(code!)

        for (const importName of importNames) {
          if (!preSuppliedImports[importName]) {
            await addImport(importName, depth + 1)
          }
        }

        try {
          preSuppliedImports[importName] = evalCompiledJs(compiled_js).exports
        } catch (e) {
          console.error("Error importing snippet", e)
        }
      }

      for (const userCodeTsciImport of userCodeTsciImports) {
        await addImport(userCodeTsciImport)
      }

      const { success, compiledTsx: compiledJs, error } = safeCompileTsx(code!)

      if (!success) {
        setTsxResult({
          compiledModule: null,
          message: `Compile Error: ${error.message}`,
          circuitJson: null,
          isLoading: false,
        })
      }

      try {
        const module = evalCompiledJs(compiledJs!)

        const componentExportKeys = Object.keys(module.exports).filter(
          (key) => !key.startsWith("use")
        )

        if (componentExportKeys.length > 1) {
          throw new Error(
            `Too many exports, only export one component. You exported: ${JSON.stringify(
              Object.keys(module.exports)
            )}`
          )
        }

        const primaryKey = componentExportKeys[0]

        const UserElm = (props: any) =>
          React.createElement(module.exports[primaryKey], props)

        try {
          const circuit = constructCircuit(UserElm, type as any)
          const renderPromise = circuit.renderUntilSettled()

          // wait one tick to allow a single render pass
          await new Promise((resolve) => setTimeout(resolve, 1))

          let circuitJson = circuit.getCircuitJson()
          setTsxResult({
            compiledModule: module,
            compiledJs,
            message: "",
            circuitJson: circuitJson as AnyCircuitElement[],
            isLoading: true,
          })

          await renderPromise

          circuitJson = circuit.getCircuitJson()
          setTsxResult({
            compiledModule: module,
            compiledJs,
            message: "",
            circuitJson: circuitJson as AnyCircuitElement[],
            isLoading: false,
          })
        } catch (error: any) {
          console.error("Evaluation error:", error)
          setTsxResult({
            compiledModule: module,
            message: `Render Error: ${error.message}`,
            circuitJson: null,
            isLoading: false,
          })
        }
      } catch (error: any) {
        console.error("Evaluation error:", error)
        setTsxResult({
          compiledModule: null,
          message: `Eval Error: ${error.message}\n\n${error.stack}`,
          circuitJson: null,
          isLoading: false,
        })
      }
    }
    run()
  }, [tsxRunTriggerCount])

  const circuitJsonKey: string = useMemo(() => {
    if (!tsxResult.circuitJson) return ""
    return `cj-${Math.random().toString(36).substring(2, 15)}`
  }, [tsxResult.circuitJson, tsxResult.circuitJson?.length])

  return {
    ...tsxResult,
    circuitJsonKey: circuitJsonKey,
    triggerRunTsx: incTsxRunTriggerCount,
    tsxRunTriggerCount,
  }
}
```

```tsx
export const evalCompiledJs = (compiledCode: string) => {
  const functionBody = `
var exports = {};
var require = globalThis.__tscircuit_require;
var module = { exports };
${compiledCode};
return module;`.trim()
  return Function(functionBody).call(globalThis)
}
```

```tsx
import { Circuit } from "@tscircuit/core"
import { useEffect, useMemo, useState } from "react"
import * as React from "react"
import { useCompiledTsx } from "../use-compiled-tsx"
import { createJSCADRenderer } from "jscad-fiber"
import { jscadPlanner } from "jscad-planner"
import { jlcPartsEngine } from "@/lib/jlc-parts-engine"

export const constructCircuit = (
  UserElm: any,
  type: "board" | "footprint" | "package" | "model"
) => {
  const circuit = new Circuit()

  if (type === "board") {
    circuit.add(<UserElm />)
    // HACK: switch to selectOne when root fixes bug with selecting board
    const board = circuit.root?.children[0]
    // const board = circuit.selectOne("board")
    if (board) {
      board.setProps({
        ...board.props,
        partsEngine: jlcPartsEngine,
      })
    }
  } else if (type === "package") {
    circuit.add(
      <board width="50mm" height="50mm">
        <UserElm name="U1" />
      </board>
    )
  } else if (type === "footprint") {
    circuit.add(
      <board width="10mm" height="10mm">
        <chip name="U1" footprint={<UserElm />} />
      </board>
    )
  } else if (type === "model") {
    const jscadGeoms: any[] = []
    const { createJSCADRoot } = createJSCADRenderer(jscadPlanner as any)
    const jscadRoot = createJSCADRoot(jscadGeoms)
    jscadRoot.render(<UserElm />)
    circuit.add(
      <board width="10mm" height="10mm">
        <chip
          name="U1"
          cadModel={{
            jscad: jscadGeoms[0],
          }}
        />
      </board>
    )
  }
  return circuit
}
```

```tsx
import * as Babel from "@babel/standalone"

export function getSyntaxError(code: string): string | null {
  try {
    Babel.transform(code, {
      filename: "index.tsx",
      presets: ["react", "typescript"],
    })
    return null
  } catch (error: unknown) {
    return (error as Error).message
  }
}
```

```tsx
import { useMemo } from "react"
import * as Babel from "@babel/standalone"

export const safeCompileTsx = (
  code: string
):
  | { success: true; compiledTsx: string; error?: undefined }
  | { success: false; error: Error; compiledTsx?: undefined } => {
  try {
    return {
      success: true,
      compiledTsx:
        Babel.transform(code, {
          presets: ["react", "typescript"],
          plugins: ["transform-modules-commonjs"],
          filename: "virtual.tsx",
        }).code || "",
    }
  } catch (error: any) {
    return { success: false, error }
  }
}

export const useCompiledTsx = (
  code?: string,
  { isStreaming = false }: { isStreaming?: boolean } = {}
) => {
  return useMemo(() => {
    if (!code) return ""
    if (isStreaming) return ""
    const result = safeCompileTsx(code)
    if (result.success) {
      return result.compiledTsx
    }
    return `Error: ${result.error.message}`
  }, [code, isStreaming])
}
```
