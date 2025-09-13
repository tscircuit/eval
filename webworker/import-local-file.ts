import * as Babel from "@babel/standalone"
import {
  resolveFilePath,
  resolveFilePathOrThrow,
} from "lib/runner/resolveFilePath"
import { dirname } from "lib/utils/dirname"
import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { evalCompiledJs } from "./eval-compiled-js"
import type { ExecutionContext } from "./execution-context"
import { importEvalPath } from "./import-eval-path"
import Debug from "debug"

const debug = Debug("tsci:eval:import-local-file")

export const importLocalFile = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0,
) => {
  debug("importLocalFile called with:", {
    importName,
  })

  const { fsMap, preSuppliedImports } = ctx

  const fsPath = resolveFilePathOrThrow(importName, fsMap)
  debug("fsPath:", fsPath)
  if (!ctx.fsMap[fsPath]) {
    debug("fsPath not found in fsMap:", fsPath)
    throw new Error(`File "${fsPath}" not found`)
  }
  const fileContent = fsMap[fsPath]
  debug("fileContent:", fileContent?.slice(0, 100))
  if (fsPath.endsWith(".json")) {
    const jsonData = JSON.parse(fileContent)
    preSuppliedImports[fsPath] = {
      __esModule: true,
      default: jsonData,
    }
  } else if (fsPath.endsWith(".obj")) {
    const objBlob = new Blob([fileContent], { type: "model/obj" })
    const objUrl = URL.createObjectURL(objBlob)
    preSuppliedImports[fsPath] = {
      __esModule: true,
      default: objUrl,
    }
  } else if (fsPath.endsWith(".glb") || fsPath.endsWith(".kicad_mod")) {
    // Check if platformConfig has projectBaseUrl for static file serving
    const platformConfig = ctx.circuit.platform as any
    if (platformConfig?.projectBaseUrl) {
      // Use projectBaseUrl for static file imports
      const staticUrl = `${platformConfig.projectBaseUrl}/${fsPath.startsWith('./') ? fsPath.slice(2) : fsPath}`
      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: staticUrl,
      }
    } else if (fsPath.endsWith(".glb")) {
      // Fallback to blob URL for .glb files when no projectBaseUrl
      const glbArray = Uint8Array.from(fileContent, (c) => c.charCodeAt(0))
      const glbBlob = new Blob([glbArray], { type: "model/gltf-binary" })
      const glbUrl = URL.createObjectURL(glbBlob)
      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: glbUrl,
      }
    } else {
      // For .kicad_mod files without projectBaseUrl, return the content as string
      preSuppliedImports[fsPath] = {
        __esModule: true,
        default: fileContent,
      }
    }
  } else if (fsPath.endsWith(".gltf")) {
    const gltfJson = JSON.parse(fileContent)
    const fileDir = dirname(fsPath)

    const inlineUri = (uri: string) => {
      if (uri && !uri.startsWith("data:") && !uri.startsWith("http")) {
        const assetPath = resolveFilePath(uri, fsMap, fileDir)
        if (!assetPath) {
          console.warn(`Asset not found for URI: ${uri} in ${fsPath}`)
          return uri
        }
        const assetContentStr = fsMap[assetPath]

        try {
          const base64Content = btoa(assetContentStr)

          let mimeType = "application/octet-stream"
          if (assetPath.endsWith(".bin")) {
            mimeType = "application/octet-stream"
          } else if (assetPath.endsWith(".png")) {
            mimeType = "image/png"
          } else if (
            assetPath.endsWith(".jpeg") ||
            assetPath.endsWith(".jpg")
          ) {
            mimeType = "image/jpeg"
          }

          return `data:${mimeType};base64,${base64Content}`
        } catch (e) {
          console.error(`Failed to encode asset to base64: ${assetPath}`, e)
          return uri
        }
      }
      return uri
    }

    if (gltfJson.buffers) {
      for (const buffer of gltfJson.buffers) {
        if (buffer.uri) buffer.uri = inlineUri(buffer.uri)
      }
    }
    if (gltfJson.images) {
      for (const image of gltfJson.images) {
        if (image.uri) image.uri = inlineUri(image.uri)
      }
    }

    const gltfContent = JSON.stringify(gltfJson)
    const gltfBlob = new Blob([gltfContent], { type: "model/gltf+json" })
    const gltfUrl = URL.createObjectURL(gltfBlob)
    preSuppliedImports[fsPath] = {
      __esModule: true,
      default: gltfUrl,
    }
  } else if (fsPath.endsWith(".tsx") || fsPath.endsWith(".ts")) {
    const importNames = getImportsFromCode(fileContent)

    for (const importName of importNames) {
      if (!preSuppliedImports[importName]) {
        await importEvalPath(importName, ctx, depth + 1, {
          cwd: dirname(fsPath),
        })
      }
    }

    const result = Babel.transform(fileContent, {
      presets: ["react", "typescript"],
      plugins: ["transform-modules-commonjs"],
      filename: "virtual.tsx",
    })

    if (!result || !result.code) {
      throw new Error("Failed to transform code")
    }

    try {
      debug("evalCompiledJs called with:", {
        code: result.code?.slice(0, 100),
        dirname: dirname(fsPath),
      })
      const importRunResult = evalCompiledJs(
        result.code,
        preSuppliedImports,
        dirname(fsPath),
      )
      debug("importRunResult:", {
        fsPath,
        importRunResult,
      })
      preSuppliedImports[fsPath] = importRunResult.exports
    } catch (error: any) {
      throw new Error(
        `Eval compiled js error for "${importName}": ${error.message}`,
      )
    }
  } else if (fsPath.endsWith(".js")) {
    // For .js files, especially from node_modules, we need to transform them
    const result = Babel.transform(fileContent, {
      presets: ["env"],
      plugins: ["transform-modules-commonjs"],
      filename: fsPath,
    })

    if (!result || !result.code) {
      throw new Error("Failed to transform JS code")
    }

    preSuppliedImports[fsPath] = evalCompiledJs(
      result.code,
      preSuppliedImports,
      dirname(fsPath),
    ).exports
  } else {
    throw new Error(
      `Unsupported file extension "${fsPath.split(".").pop()}" for "${fsPath}"`,
    )
  }
}
