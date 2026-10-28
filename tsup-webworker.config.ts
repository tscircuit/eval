import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./webworker/entrypoint.ts"],
  format: ["esm"],
  platform: "browser",
  // sourcemap: "inline",
  outDir: "dist/webworker",
  splitting: false,
  minify: false,
  noExternal: [
    "@tscircuit/core",
    "circuit-json",
    "@tscircuit/parts-engine",
    "@tscircuit/fabricator-drc",
    "sucrase",
    "@tscircuit/math-utils",
    "@tscircuit/mm",
    "zod",
  ],
  // Node-only paths in core's 3D dependencies: occt-import-js and
  // circuit-json-to-gltf only dynamically import node builtins under Node
  external: ["fs", "os", "path"],
  esbuildPlugins: [
    {
      // circuit-json-to-gltf imports native resvg outside the DOM and falls back
      // to a browser renderer when it throws. Without code splitting the import
      // is hoisted to the top of the bundle, so it can't stay external.
      name: "stub-resvg",
      setup(build) {
        build.onResolve({ filter: /^@resvg\/resvg-js$/ }, (args) => ({
          path: args.path,
          namespace: "stub-resvg",
        }))
        build.onLoad({ filter: /.*/, namespace: "stub-resvg" }, () => ({
          contents: `export class Resvg {
  constructor() {
    throw new Error("@resvg/resvg-js is not available in the browser")
  }
}`,
          loader: "js",
        }))
      },
    },
  ],
  clean: true,
  dts: true,
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".wasm": "dataurl",
    }
    options.minifySyntax = true
    options.minifyWhitespace = true
    options.minifyIdentifiers = false
  },
})
