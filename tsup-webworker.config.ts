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
    "@tscircuit/ti-parts-engine/footprint-library",
    "sucrase",
    "@tscircuit/math-utils",
    "@tscircuit/mm",
    "zod",
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
