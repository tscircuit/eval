import { resolveFilePathOrThrow } from "./resolveFilePath"

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
    } else if ("tscircuit.config.js" in opts.fsMap) {
      const configContent = opts.fsMap["tscircuit.config.js"]
      try {
        const config = JSON.parse(configContent)
        if (config.mainEntrypoint) {
          opts.mainComponentPath = config.mainEntrypoint // TODO: variable update name in cli to mainComponentPath
        }
      } catch (e) {
        console.warn("Failed to parse tscircuit.config.js:", e)
      }
    } else {
      throw new Error(
        "Either entrypoint or mainComponentPath must be provided (no index file, could not infer entrypoint)",
      )
    }
  }

  if (!opts.entrypoint && opts.mainComponentPath) {
    opts.entrypoint = "entrypoint.tsx"
    const mainComponentCode =
      opts.fsMap[resolveFilePathOrThrow(opts.mainComponentPath, opts.fsMap)]
    if (!mainComponentCode) {
      throw new Error(
        `Main component path "${opts.mainComponentPath}" not found in fsMap. Available paths: ${Object.keys(opts.fsMap).join(", ")}`,
      )
    }

    const hasExplicitBoard = mainComponentCode.includes("<board")
    const hasTsciImport =
      mainComponentCode.includes("@tsci/") ||
      mainComponentCode.includes('from "@tsci')
    const shouldWrapInBoard = !hasExplicitBoard && !hasTsciImport

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
