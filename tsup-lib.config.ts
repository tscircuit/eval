import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./lib/index.ts"],
  format: ["esm"],
  sourcemap: "inline",
  outDir: "dist/lib",
  noExternal: [
    "@tscircuit/parts-engine",
    "@tscircuit/ti-parts-engine/footprint-library",
  ],
  clean: true,
  dts: true,
})
