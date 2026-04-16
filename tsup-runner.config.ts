import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./lib/runner/index.ts"], // Assuming index.ts is the entrypoint within the runner directory
  format: ["esm"],
  platform: "browser",
  sourcemap: "inline", // Added for consistency
  outDir: "dist/eval",
  noExternal: ["@tscircuit/parts-engine"],
  clean: true, // Added for consistency
  dts: true,
})
