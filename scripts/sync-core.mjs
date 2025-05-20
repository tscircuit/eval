import corePackageJson from "@tscircuit/core/package.json"
import currentPackageJson from "../package.json"
import { join } from "node:path"
import { promises as fs } from "fs"

const coreDeps = {
  ...corePackageJson.devDependencies,
  ...corePackageJson.dependencies,
}

const currentDeps = { ...currentPackageJson.dependencies }
const depsToUpdate = {}

let modifiedDeps = false
// Update dependencies to match core
for (const [packageName, currentVersion] of Object.entries(currentDeps)) {
  if (packageName in coreDeps && coreDeps[packageName] !== currentVersion) {
    console.log(
      `Updating ${packageName} from ${currentVersion} to ${coreDeps[packageName]}`,
    )
    depsToUpdate[packageName] = coreDeps[packageName]
    modifiedDeps = true
  }
}

if (modifiedDeps) {
  // Use regex to replace the dependencies in the package.json
  const packageJsonPath = join(import.meta.dirname, "../package.json")
  const packageJson = await fs.readFile(packageJsonPath, "utf-8")
  for (const [packageName, version] of Object.entries(depsToUpdate)) {
    const pattern = `"${packageName}":\\s*"${currentDeps[packageName].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"(,)?`
    packageJson = packageJson.replace(
      new RegExp(pattern),
      `"${packageName}": "${version}"$1`,
    )
  }
  await fs.writeFile(packageJsonPath, packageJson)
}
