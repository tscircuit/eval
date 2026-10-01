import { expect, test } from "bun:test"
import { semver } from "bun"
import packageJson from "../../package.json"

test("the packaged fabricator engine declares its required Circuit JSON runtime dependency", () => {
  const range = packageJson.dependencies["circuit-json"]
  expect(semver.satisfies("0.0.479", range)).toBe(false)
  expect(semver.satisfies("0.0.507", range)).toBe(true)
})
