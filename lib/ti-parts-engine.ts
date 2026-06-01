// GitHub-installed ti-parts-engine currently ships source files rather than a
// built dist entrypoint, so eval bridges to the browser-safe source export.
export {
  createTiFootprintLibrary,
  type TiPartsEngineConfig,
} from "../node_modules/@tscircuit/ti-parts-engine/footprint-library.ts"
