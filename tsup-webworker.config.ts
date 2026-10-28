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
  // Node-only paths in core's 3D dependencies: circuit-json-to-gltf lazily
  // imports native resvg outside the DOM and falls back to a browser renderer,
  // and occt-import-js only touches node builtins when running under Node
  external: ["@resvg/resvg-js", "fs", "os", "path"],
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
