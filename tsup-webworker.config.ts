import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./webworker/entrypoint.ts"],
  format: ["esm"],
  platform: "browser",
  // sourcemap: "inline",
  outDir: "dist/webworker",
  splitting: false,
  minify: true,
  noExternal: [
    "@tscircuit/core",
    "circuit-json",
    "@tscircuit/parts-engine",
    "@babel/standalone",
    "@tscircuit/math-utils",
    "zod",
  ],
  clean: true,
  dts: true,
})
