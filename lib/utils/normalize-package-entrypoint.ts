export const normalizePackageEntrypoint = (entrypoint: string) =>
  entrypoint.replace(/^\.\//, "")
