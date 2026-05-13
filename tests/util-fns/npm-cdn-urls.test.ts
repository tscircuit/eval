import { expect, test } from "bun:test"
import {
  getJscdnPackageFileUrl,
  getJscdnPackageUrl,
  getJsdelivrPackageFileUrl,
} from "lib/utils/npm-cdn-urls"

test("builds jscdn package urls", () => {
  expect(getJscdnPackageUrl("circuit-json-to-kicad")).toBe(
    "https://jscdn.tscircuit.com/circuit-json-to-kicad/latest",
  )
  expect(getJscdnPackageUrl("circuit-json-to-kicad@0.0.133")).toBe(
    "https://jscdn.tscircuit.com/circuit-json-to-kicad/0.0.133",
  )
  expect(getJscdnPackageUrl("@tscircuit/core@0.0.1232")).toBe(
    "https://jscdn.tscircuit.com/@tscircuit/core/0.0.1232",
  )
  expect(getJscdnPackageUrl("@tscircuit/core@0.0.1232/package.json")).toBe(
    "https://jscdn.tscircuit.com/@tscircuit/core/0.0.1232/package.json",
  )
})

test("builds package file urls for jscdn and jsdelivr", () => {
  expect(
    getJscdnPackageFileUrl({
      packageName: "@tscircuit/eval",
      version: "latest",
      filePath: "dist/webworker/entrypoint.js",
    }),
  ).toBe(
    "https://jscdn.tscircuit.com/@tscircuit/eval/latest/dist/webworker/entrypoint.js",
  )
  expect(
    getJsdelivrPackageFileUrl({
      packageName: "@tscircuit/eval",
      version: "latest",
      filePath: "dist/webworker/entrypoint.js",
    }),
  ).toBe(
    "https://cdn.jsdelivr.net/npm/@tscircuit/eval@latest/dist/webworker/entrypoint.js",
  )
})
