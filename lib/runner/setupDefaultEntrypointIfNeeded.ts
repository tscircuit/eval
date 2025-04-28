import { resolveFilePath, resolveFilePathOrThrow } from "./resolveFilePath"

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

  // Add partsEngine to all board components in the fsMap
  for (const [path, code] of Object.entries(opts.fsMap)) {
    if (code.includes("<board") && !code.includes("partsEngine=")) {
      // Add import if not already present
      const importStatement =
        'import { jlcPartsEngine } from "@tscircuit/parts-engine";\n'
      const hasImport = code.includes("import { jlcPartsEngine }")
      const modifiedCode = hasImport ? code : importStatement + code

      // Add partsEngine prop
      opts.fsMap[path] = modifiedCode.replace(
        /<board([^>]*)/g,
        "<board$1 partsEngine={jlcPartsEngine}",
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
    opts.fsMap[opts.entrypoint] = `
     import * as UserComponents from "./${opts.mainComponentPath}";
     import { jlcPartsEngine } from "@tscircuit/parts-engine";
          
      const hasBoard = ${mainComponentCode.includes("<board").toString()};
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
          <board partsEngine={jlcPartsEngine}>
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
