import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./lib/index.ts"],
  format: ["esm"],
  sourcemap: "inline",
  outDir: "dist/lib",
  noExternal: ["@tscircuit/parts-engine", "@tscircuit/fabricator-drc"],
  clean: true,
  dts: true,
})
