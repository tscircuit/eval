import { resolveFilePath } from "lib/runner/resolveFilePath"
import { expect, test } from "bun:test"

test("resolveFilePath should handle relative imports from subdirectories", () => {
  const mockFs = {
    "components/button.tsx": "export const Button = () => <button />",
    "components/shared/icons/icon.tsx": "export const Icon = () => <svg />",
    "components/shared/utils.ts": "export const formatText = (t: string) => t",
  }

  // Test import from subdirectory to parent directory
  expect(
    resolveFilePath(
      "../utils",
      mockFs,
      "components/shared/icons"
    )
  ).toBe("components/shared/utils.ts")

  // Test import from deep subdirectory to parent's parent
  expect(
    resolveFilePath(
      "../../button",
      mockFs,
      "components/shared/icons"
    )
  ).toBe("components/button.tsx")

  // Test non-existent relative import
  expect(
    resolveFilePath(
      "../nonexistent",
      mockFs,
      "components/shared"
    )
  ).toBe(null)
})