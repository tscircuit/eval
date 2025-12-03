/**
 * Postinstall script to synchronize core-related package versions
 * with the main tscircuit core repository.
 *
 * This script is run after dependencies are installed to ensure
 * that tscircuit/eval always has matching versions with @tscircuit/core.
 */

// @ts-ignore
import corePackageJson from "@tscircuit/core/package.json"
import currentPackageJson from "../package.json"

const DO_NOT_SYNC_PACKAGE = [
  "@biomejs/biome",
  "@tscircuit/import-snippet",
  "@tscircuit/layout",
  "@tscircuit/log-soup",
  "@tscircuit/common",
  "@tscircuit/schematic-autolayout",
  "@types/*",
  "tsup",
  "react-reconciler",
  "react-reconciler-18",
  "bun-match-svg",
  "chokidar-cli",
  "pkg-pr-new",
  "howfat",
  "live-server",
  "looks-same",
  "ts-expect",
  "concurrently",
  "nanoid",
  "eecircuit-engine",
  "@flatten-js/core",
  "@lume/kiwi",
  "calculate-packing",
  "css-select",
  "format-si-unit",
  "performance-now",
  "transformation-matrix",
]

try {
  const coreDeps: any = {
    ...corePackageJson.devDependencies,
    ...corePackageJson.dependencies,
  }

  const currentDeps: any = {
    ...currentPackageJson.devDependencies,
    ...(currentPackageJson as any).dependencies,
  }
  const depsToUpdate: any = {}

  let modifiedDeps = false

  // Update dependencies to match core
  for (const [packageName, currentVersion] of Object.entries(currentDeps)) {
    if (packageName in coreDeps && coreDeps[packageName] !== currentVersion) {
      console.log(
        `Updating ${packageName} from ${currentVersion} to ${coreDeps[packageName]}`,
      )
      depsToUpdate[packageName] = coreDeps[packageName as keyof typeof coreDeps]
      modifiedDeps = true
    }
  }

  // Check for missing core dependencies
  const missingDeps: string[] = []
  for (const packageName of Object.keys(coreDeps)) {
    if (
      DO_NOT_SYNC_PACKAGE.some((dnsp) =>
        dnsp.includes("*")
          ? packageName.startsWith(dnsp.replace("*", ""))
          : packageName === dnsp,
      )
    ) {
      continue
    }
    if (!(packageName in currentDeps)) {
      missingDeps.push(packageName)
    }
  }

  if (missingDeps.length > 0) {
    throw new Error(
      `Missing core dependencies in package.json: ${missingDeps.join(", ")}. ` +
        `\n\nAdd them to package.json or add to DO_NOT_SYNC_PACKAGE list.`,
    )
  }

  if (modifiedDeps) {
    // Use regex to replace the dependencies in the package.json
    const packageJsonPath = new URL("../package.json", import.meta.url).pathname
    // @ts-ignore Bun global
    let packageJson = await Bun.file(packageJsonPath).text()
    for (const [packageName, version] of Object.entries(depsToUpdate)) {
      const pattern = `"${packageName}":\\s*"${currentDeps[packageName].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"(,)?`
      packageJson = packageJson.replace(
        new RegExp(pattern),
        `"${packageName}": "${version}"$1`,
      )
    }
    // @ts-ignore Bun global
    await Bun.write(packageJsonPath, packageJson)
    console.log("✓ Core versions synchronized successfully")
  } else {
    console.log("✓ All dependencies are already in sync with core")
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(`✗ Failed to synchronize core versions: ${error.message}`)
    if (error.message.includes("Cannot find module")) {
      console.error(
        "Error: @tscircuit/core package not found. Make sure dependencies are installed.",
      )
    }
  } else {
    console.error("✗ An unexpected error occurred during postinstall")
  }
  // @ts-ignore process global
  process.exit(1)
}
