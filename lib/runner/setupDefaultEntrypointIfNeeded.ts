import { resolveFilePath, resolveFilePathOrThrow } from "./resolveFilePath"
import { getImportsFromCode } from "../utils/get-imports-from-code"
import { dirname } from "../utils/dirname"

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
    opts.entrypoint = "entrypoint.tsx"
    const resolvedMainPath = resolveFilePathOrThrow(
      opts.mainComponentPath,
      opts.fsMap,
    )
    const mainComponentCode = opts.fsMap[resolvedMainPath]
    if (!mainComponentCode) {
      throw new Error(
        `Main component path "${opts.mainComponentPath}" not found in fsMap. Available paths: ${Object.keys(opts.fsMap).join(", ")}`,
      )
    }

    const visited = new Set<string>()
    const fileContainsBoard = (filePath: string): boolean => {
      if (visited.has(filePath)) return false
      visited.add(filePath)
      const code = opts.fsMap[filePath]
      if (!code) return false
      if (code.includes("<board")) return true
      for (const imp of getImportsFromCode(code)) {
        const resolved = resolveFilePath(imp, opts.fsMap, dirname(filePath))
        if (resolved && fileContainsBoard(resolved)) return true
      }
      return false
    }

    let hasBoard = fileContainsBoard(resolvedMainPath)
    if (!hasBoard) {
      const imports = getImportsFromCode(mainComponentCode)
      if (imports.some((imp) => imp.startsWith("@tsci/"))) {
        hasBoard = true
      }
    }

    opts.fsMap[opts.entrypoint] = `
     import * as UserComponents from "./${opts.mainComponentPath}";

      const hasBoard = ${hasBoard.toString()};
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
        hasBoard ? (
          <ComponentToRender ${opts.mainComponentProps ? `{...${JSON.stringify(opts.mainComponentProps, null, 2)}}` : ""} />
        ) : (
          <board>
            <ComponentToRender name="U1" ${opts.mainComponentProps ? `{...${JSON.stringify(opts.mainComponentProps, null, 2)}}` : ""} />
          </board>
        )
      );
`
  }

  if (!opts.name && opts.mainComponentName) {
    opts.name = opts.mainComponentName
  }
}
