import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("core sync supplies collision peers and preserves their root resolution overrides", async () => {
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
        overrides: { "eval-only": "1.0.0", "circuit-json": "0.0.539" },
      }),
    )
    await writeFile(
      join(root, "node_modules/@tscircuit/core/package.json"),
      JSON.stringify({
        devDependencies: {
          "@tscircuit/manifold-2d": "^0.0.8",
          "@tscircuit/cad-collision-checking":
            "https://jscdn.tscircuit.com/@tscircuit/cad-collision-checking/0.0.5.tgz",
          "jscad-to-manifold": "github:tscircuit/jscad-to-manifold#6db5a7b",
          "@tscircuit/graphics-debug-3d":
            "https://jscdn.tscircuit.com/@tscircuit/graphics-debug-3d/0.0.1.tgz",
          "new-runtime": "1.0.0",
        },
        overrides: {
          "@tscircuit/graphics-debug-3d":
            "https://jscdn.tscircuit.com/@tscircuit/graphics-debug-3d/0.0.1.tgz",
          "circuit-json": "^0.0.541",
        },
      }),
    )
    const run = () =>
      Bun.spawnSync([process.execPath, "scripts/copy-core-versions.ts"], {
        cwd: root,
      })
    const result = run()
    expect(result.exitCode, result.stderr.toString()).toBe(0)
    const { devDependencies, overrides } = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    )
    expect(devDependencies).toEqual({
      "@tscircuit/manifold-2d": "^0.0.8",
      "@tscircuit/cad-collision-checking":
        "https://jscdn.tscircuit.com/@tscircuit/cad-collision-checking/0.0.5.tgz",
      "jscad-to-manifold": "github:tscircuit/jscad-to-manifold#6db5a7b",
      "@tscircuit/graphics-debug-3d":
        "https://jscdn.tscircuit.com/@tscircuit/graphics-debug-3d/0.0.1.tgz",
      "new-runtime": "1.0.0",
    })
    expect(overrides).toEqual({
      "eval-only": "1.0.0",
      "circuit-json": "^0.0.541",
      "@tscircuit/graphics-debug-3d":
        "https://jscdn.tscircuit.com/@tscircuit/graphics-debug-3d/0.0.1.tgz",
    })
    // Overrides must also synchronize when every dependency already matches.
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        devDependencies,
        overrides: { "eval-only": "1.0.0", "circuit-json": "0.0.539" },
      }),
    )
    const overridesOnly = run()
    expect(overridesOnly.exitCode, overridesOnly.stderr.toString()).toBe(0)
    const updated = await readFile(join(root, "package.json"), "utf8")
    expect(JSON.parse(updated).overrides).toEqual(overrides)
    expect(run().exitCode).toBe(0)
    expect(await readFile(join(root, "package.json"), "utf8")).toBe(updated)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
