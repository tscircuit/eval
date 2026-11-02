// @ts-ignore
import corePackageJson from "@tscircuit/core/package.json"
import currentPackageJson from "../package.json"
import { join } from "node:path"

const DONT_SYNC_FROM_CORE: string[] = []

const coreDeps: any = {
  ...corePackageJson.devDependencies,
  ...corePackageJson.dependencies,
}

const currentDeps: any = { ...currentPackageJson.devDependencies }
const depsToUpdate: any = {}

let modifiedDeps = false

// Bun needs the consumer's root overrides to resolve wildcard peers published
// outside npm, even when their concrete URLs are also development dependencies.
const currentOverrides = (currentPackageJson as any).overrides || {}
const overridesToSync = {
  ...currentOverrides,
  ...(corePackageJson as any).overrides,
}
const modifiedOverrides =
  JSON.stringify(currentOverrides) !== JSON.stringify(overridesToSync)

// Update existing dependencies to match core
for (const [packageName, currentVersion] of Object.entries(currentDeps)) {
  if (packageName in coreDeps && coreDeps[packageName] !== currentVersion) {
    console.log(
      `Updating ${packageName} from ${currentVersion} to ${coreDeps[packageName]}`,
    )
    depsToUpdate[packageName] = coreDeps[packageName as keyof typeof coreDeps]
    modifiedDeps = true
  }
}

// Add new dependencies from core that we don't have yet
for (const [packageName, version] of Object.entries(
  corePackageJson.devDependencies || {},
)) {
  if (
    !DONT_SYNC_FROM_CORE.includes(packageName) &&
    !(packageName in currentDeps)
  ) {
    console.log(`Adding new dependency ${packageName}: ${version}`)
    depsToUpdate[packageName] = version
    modifiedDeps = true
  }
}

if (modifiedDeps || modifiedOverrides) {
  // Use regex to replace the dependencies in the package.json
  const packageJsonPath = join(import.meta.dirname, "../package.json")
  let packageJson = await Bun.file(packageJsonPath).text()

  // Update existing dependencies
  for (const [packageName, version] of Object.entries(depsToUpdate)) {
    if (packageName in currentDeps) {
      const pattern = `"${packageName}":\\s*"${currentDeps[packageName].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"(,)?`
      packageJson = packageJson.replace(
        new RegExp(pattern),
        `"${packageName}": "${version}"$1`,
      )
    }
  }

  // Add new dependencies at the end of devDependencies
  const newDeps = Object.entries(depsToUpdate).filter(
    ([packageName]) => !(packageName in currentDeps),
  )
  if (newDeps.length > 0) {
    // Find the last dependency in devDependencies and add after it
    const devDepsPattern = /"devDependencies":\s*{([^}]+)}/
    const match = packageJson.match(devDepsPattern)
    if (match) {
      const devDepsContent = match[1]
      const newDepsStr = newDeps
        .map(([name, version]) => `    "${name}": "${version}"`)
        .join(",\n")
      const updatedDevDeps = `${devDepsContent.trimEnd()},\n${newDepsStr}`
      packageJson = packageJson.replace(
        devDepsPattern,
        `"devDependencies": {${updatedDevDeps}}`,
      )
    }
  }

  if (modifiedOverrides) {
    const manifest = JSON.parse(packageJson)
    manifest.overrides = overridesToSync
    packageJson = `${JSON.stringify(manifest, null, 2)}\n`
  }

  await Bun.write(packageJsonPath, packageJson)
}
