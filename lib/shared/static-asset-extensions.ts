export const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".kicad_mod",
  ".gltf",
  ".obj",
  ".stl",
  ".step",
  ".stp",
]

export const isStaticAssetPath = (path: string) =>
  STATIC_ASSET_EXTENSIONS.some((ext) => path.endsWith(ext))
