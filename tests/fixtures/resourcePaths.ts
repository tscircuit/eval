export const repoFileUrl = (pathFromRoot: string) => {
  return new URL(`../../${pathFromRoot}`, import.meta.url)
}
