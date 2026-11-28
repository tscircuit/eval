import { type Options, defineConfig } from "tsup"

const sharedRunnerConfig: Options = {
  entry: ["./lib/runner/index.ts"],
  format: ["esm"],
  platform: "browser",
  sourcemap: "inline",
  noExternal: ["@tscircuit/parts-engine", "@tscircuit/fabricator-drc"],
  clean: true,
  dts: true,
}

export default defineConfig([
  {
    ...sharedRunnerConfig,
    outDir: "dist/eval",
  },
  {
    ...sharedRunnerConfig,
    outDir: "dist/runner",
  },
])
