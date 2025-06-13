import { resolveFilePath, resolveFilePathOrThrow } from "./resolveFilePath"
import { getImportsFromCode } from "../utils/get-imports-from-code"
import { dirname } from "lib/utils/dirname"

const scanForBoardAndTsci = (
  filePath: string,
  fsMap: Record<string, string>,
  visited: Set<string> = new Set(),
): { hasBoard: boolean; hasTsciImport: boolean } => {
  const resolved = resolveFilePathOrThrow(filePath, fsMap)
  if (visited.has(resolved)) return { hasBoard: false, hasTsciImport: false }
  visited.add(resolved)

  const code = fsMap[resolved]
  const hasBoard = code.includes("<board")
  const hasTsciImport = code.includes("@tsci/") || code.includes('from "@tsci')

  let result = { hasBoard, hasTsciImport }
  for (const imp of getImportsFromCode(code)) {
    if (!imp.startsWith(".")) continue
    const child = resolveFilePath(imp, fsMap, dirname(resolved))
    if (child && fsMap[child]) {
      const childRes = scanForBoardAndTsci(child, fsMap, visited)
      result.hasBoard ||= childRes.hasBoard
      result.hasTsciImport ||= childRes.hasTsciImport
    }
    if (result.hasBoard && result.hasTsciImport) break
  }
  return result
}

export const setupDefaultEntrypointIfNeeded = (opts: {
  entrypoint?: string
  fsMap: Record<string, string>
  mainComponentPath?: string
  mainComponentName?: string
  name?: string
  mainComponentProps?: Record<string, any>
}) => {
  if (!opts.entrypoint && !opts.mainComponentPath) {
    if ("index.tsx" in opts.fsMap) {
      opts.mainComponentPath = "index.tsx"
    } else if ("index.ts" in opts.fsMap) {
      opts.mainComponentPath = "index.ts"
    } else if (
      Object.keys(opts.fsMap).filter((k) => k.endsWith(".tsx")).length === 1
    ) {
      opts.mainComponentPath = Object.keys(opts.fsMap)[0]
    } else {
      throw new Error(
        "Either entrypoint or mainComponentPath must be provided (no index file, could not infer entrypoint)",
      )
    }
  }

  if (!opts.entrypoint && opts.mainComponentPath) {
    const mainComponentResolved = resolveFilePathOrThrow(
      opts.mainComponentPath,
      opts.fsMap,
    )
    const mainComponentCode = opts.fsMap[mainComponentResolved]
    const usesCircuitAdd = mainComponentCode.includes("circuit.add(")

    const { hasBoard: hasExplicitBoard, hasTsciImport } = scanForBoardAndTsci(
      opts.mainComponentPath,
      opts.fsMap,
    )
    const shouldWrapInBoard = !hasExplicitBoard && !hasTsciImport

    if (usesCircuitAdd) {
      opts.entrypoint = opts.mainComponentPath
      return
    }

    opts.entrypoint = "entrypoint.tsx"

    opts.fsMap[opts.entrypoint] = `
     import * as UserComponents from "./${opts.mainComponentPath}";
          
      ${
        opts.mainComponentName
          ? `
        const ComponentToRender = UserComponents["${opts.mainComponentName}"]
        `
          : `const ComponentToRender = Object.entries(UserComponents)
        .filter(([name]) => !name.startsWith("use"))
        .map(([_, component]) => component)[0] || (() => null);`
      }

      circuit.add(
        ${
          shouldWrapInBoard
            ? `
          <board>
            <ComponentToRender name="U1" ${opts.mainComponentProps ? `{...${JSON.stringify(opts.mainComponentProps, null, 2)}}` : ""} />
          </board>
        `
            : `
          <ComponentToRender ${opts.mainComponentProps ? `{...${JSON.stringify(opts.mainComponentProps, null, 2)}}` : ""} />
        `
        }
      );
`
  }

  if (!opts.name && opts.mainComponentName) {
    opts.name = opts.mainComponentName
  }
}
