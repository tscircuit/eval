import { test, expect } from "bun:test"
import { getStaticAssetPathsFromCode } from "lib/utils/get-static-asset-paths-from-code"

test("extracts GLB paths from var assignments", () => {
  const code = `
var MachinePinMediumStandardGlbUrl = "./assets/MachinePinMediumStandard-7a4064cf.glb";
var MachinePinMediumShortGlbUrl = "./assets/MachinePinMediumShort-f32ba626.glb";
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("./assets/MachinePinMediumStandard-7a4064cf.glb")
  expect(paths).toContain("./assets/MachinePinMediumShort-f32ba626.glb")
  expect(paths).toHaveLength(2)
})

test("extracts paths from const and let assignments", () => {
  const code = `
const glbUrl = "./model.glb";
let objUrl = "./model.obj";
var gltfUrl = "./model.gltf";
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("./model.glb")
  expect(paths).toContain("./model.obj")
  expect(paths).toContain("./model.gltf")
  expect(paths).toHaveLength(3)
})

test("extracts paths from object property assignments", () => {
  const code = `
const config = {
  glbPath: "./assets/model.glb",
  stepPath: "./assets/model.step",
};
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("./assets/model.glb")
  expect(paths).toContain("./assets/model.step")
  expect(paths).toHaveLength(2)
})

test("handles single quotes", () => {
  const code = `
var url = './assets/file.glb';
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("./assets/file.glb")
})

test("ignores non-static-asset paths", () => {
  const code = `
var name = "./SomeComponent.tsx";
var path = "./utils/helper.js";
var glbPath = "./assets/model.glb";
  `

  const paths = getStaticAssetPathsFromCode(code)

  // Should only extract the .glb file
  expect(paths).toContain("./assets/model.glb")
  expect(paths).toHaveLength(1)
})

test("handles paths without leading ./", () => {
  const code = `
var url = "assets/model.glb";
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toHaveLength(0) // Should not match paths without ./ or ../
})

test("handles relative parent paths", () => {
  const code = `
var url = "../assets/model.glb";
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("../assets/model.glb")
})

test("handles kicad_mod files", () => {
  const code = `
var footprint = "./footprints/resistor.kicad_mod";
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths).toContain("./footprints/resistor.kicad_mod")
})

test("avoids duplicates", () => {
  const code = `
var url1 = "./model.glb";
var url2 = "./model.glb";
const config = {
  glbPath: "./model.glb"
};
  `

  const paths = getStaticAssetPathsFromCode(code)

  expect(paths.filter((p) => p === "./model.glb")).toHaveLength(1)
})
