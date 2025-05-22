import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { promises as fs } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const corePackagePath = join(process.cwd(), "./node_modules/@tscircuit/core/package.json")
const currentPackagePath = join(process.cwd(), "./package.json")

const [corePackageJsonRaw, currentPackageJsonRaw] = await Promise.all([
  fs.readFile(corePackagePath, "utf-8"),
  fs.readFile(currentPackagePath, "utf-8"),
])

const corePackageJson = JSON.parse(corePackageJsonRaw)
const currentPackageJson = JSON.parse(currentPackageJsonRaw)

const coreDeps = {
  ...corePackageJson.devDependencies,
  ...corePackageJson.dependencies,
}

const currentDeps = { ...currentPackageJson.dependencies }
const depsToUpdate = {}

let modifiedDeps = false

for (const [packageName, currentVersion] of Object.entries(currentDeps)) {
  if (packageName in coreDeps && coreDeps[packageName] !== currentVersion) {
    console.log(`Updating ${packageName} from ${currentVersion} to ${coreDeps[packageName]}`)
    depsToUpdate[packageName] = coreDeps[packageName]
    modifiedDeps = true
  }
}
throw new Error(JSON.stringify(depsToUpdate, null, 2))
if (modifiedDeps) {
  let updatedPackageJson = currentPackageJsonRaw

  for (const [packageName, version] of Object.entries(depsToUpdate)) {
    const pattern = `"${packageName}":\\s*"${currentDeps[packageName].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"(,)?`
    updatedPackageJson = updatedPackageJson.replace(
      new RegExp(pattern),
      `"${packageName}": "${version}"$1`,
    )
  }

  await fs.writeFile(currentPackagePath, updatedPackageJson)
  console.log("Dependencies synced from @tscircuit/core.")
} else {
  console.log("No dependency updates needed.")
}
