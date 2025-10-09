import { resolveFilePathOrThrow } from "./resolveFilePath"
import Debug from "debug"

const debug = Debug("tsci:eval:setupDefaultEntrypointIfNeeded")

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
    } else if ("tscircuit.config.json" in opts.fsMap) {
      const configContent = opts.fsMap["tscircuit.config.json"]
      try {
        const config = JSON.parse(configContent)
        if (config.mainEntrypoint) {
          opts.entrypoint = config.mainEntrypoint
        }
      } catch (e) {
        console.warn("Failed to parse tscircuit.config.json:", e)
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
      opts.fsMap[
        resolveFilePathOrThrow(opts.mainComponentPath, {
          fsMap: opts.fsMap,
        })
      ]
    if (!mainComponentCode) {
      throw new Error(
        `Main component path "${opts.mainComponentPath}" not found in fsMap. Available paths: ${Object.keys(opts.fsMap).join(", ")}`,
      )
    }
    opts.fsMap[opts.entrypoint] = `
     import * as UserComponents from "./${opts.mainComponentPath}";
          
      ${
        opts.mainComponentName
          ? `
        const ComponentToRender = UserComponents["${opts.mainComponentName}"]
        `
          : `const ComponentToRender = UserComponents.default || 
          Object.entries(UserComponents)
          .filter(([name]) => !name.startsWith("use"))
          .map(([_, component]) => component)[0] || (() => null);`
      }

           ${
             debug.enabled
               ? `
     console.log({ UserComponents })
     console.log("ComponentToRender " + ComponentToRender.toString(),  { ComponentToRender })
     `
               : ""
           }

      circuit.add(       
          <ComponentToRender ${opts.mainComponentProps ? `{...${JSON.stringify(opts.mainComponentProps, null, 2)}}` : ""} /> 
      );
`
  }

  if (!opts.name && opts.mainComponentName) {
    opts.name = opts.mainComponentName
  }
}
