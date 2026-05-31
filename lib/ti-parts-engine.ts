// Temporary adapter for the unpublished GitHub dependency.
//
// We intentionally import the narrow source modules instead of the package root
// because the root dist bundle also includes node-only archive extraction code,
// which breaks eval's browser and webworker bundles.
//
// Once @tscircuit/ti-parts-engine ships browser-safe package exports, this
// adapter can be removed and callers can import from the package root directly.
export { createTiFootprintLibrary } from "../node_modules/@tscircuit/ti-parts-engine/lib/ti-parts-engine/createTiFootprintLibrary"
export type { TiPartsEngineOptions as TiPartsEngineConfig } from "../node_modules/@tscircuit/ti-parts-engine/lib/ti-parts-engine/types"
