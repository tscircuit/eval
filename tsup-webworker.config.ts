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
    "sucrase",
    "@tscircuit/math-utils",
    "zod",
  ],
  clean: true,
  dts: true,
  esbuildOptions(options) {
    options.minifySyntax = true
    options.minifyWhitespace = true
    options.minifyIdentifiers = false
  },
})
