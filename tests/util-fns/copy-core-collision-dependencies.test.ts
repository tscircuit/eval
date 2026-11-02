import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("core sync updates the shared runtime without installing bundled collision tools", async () => {
  const root = await mkdtemp(join(tmpdir(), "eval-collision-dependencies-"))
  try {
    await mkdir(join(root, "scripts"), { recursive: true })
    await mkdir(join(root, "node_modules/@tscircuit/core"), { recursive: true })
    await writeFile(
      join(root, "scripts/copy-core-versions.ts"),
      await readFile(
        new URL("../../scripts/copy-core-versions.ts", import.meta.url),
      ),
    )
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        devDependencies: { "@tscircuit/manifold-2d": "^0.0.6" },
      }),
    )
    await writeFile(
      join(root, "node_modules/@tscircuit/core/package.json"),
      JSON.stringify({
        devDependencies: {
          "@tscircuit/manifold-2d": "^0.0.8",
          "@tscircuit/cad-collision-checking":
            "github:tscircuit/cad-collision-checking#6e86d19",
          "jscad-to-manifold": "github:tscircuit/jscad-to-manifold#6db5a7b",
          "@tscircuit/graphics-debug-3d":
            "https://jscdn.tscircuit.com/@tscircuit/graphics-debug-3d/0.0.1.tgz",
          "new-runtime": "1.0.0",
        },
      }),
    )
    const run = Bun.spawnSync(
      [process.execPath, "scripts/copy-core-versions.ts"],
      { cwd: root },
    )
    expect(run.exitCode, run.stderr.toString()).toBe(0)
    const { devDependencies } = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    )
    expect(devDependencies).toEqual({
      "@tscircuit/manifold-2d": "^0.0.8",
      "new-runtime": "1.0.0",
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
