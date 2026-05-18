import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./lib/getPlatformConfig/getPlatformConfig.ts"],
  format: ["esm"],
  sourcemap: "inline",
  outDir: "dist/platform-config",
  noExternal: ["@tscircuit/parts-engine"],
  clean: true,
  dts: true,
})
