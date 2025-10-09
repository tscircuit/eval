import { z } from "zod"

const tsconfigSchema = z.object({
  compilerOptions: z
    .object({
      paths: z.record(z.array(z.string())).optional(),
    })
    .optional(),
})

export const getTsConfigPaths = (
  tsconfigContent: string | undefined,
): Record<string, string[]> | undefined => {
  if (!tsconfigContent) return undefined

  try {
    const tsconfig = tsconfigSchema.parse(JSON.parse(tsconfigContent))
    return tsconfig.compilerOptions?.paths
  } catch (e) {
    // ignore invalid tsconfig
    return undefined
  }
}
