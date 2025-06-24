import { expect, test } from "bun:test"
import { getPossibleEntrypointComponentPaths } from "lib/getPossibleEntrypointComponentPaths"

test("returns index.tsx if present", () => {
  const paths = getPossibleEntrypointComponentPaths({
    "index.tsx": "export default () => null",
    "foo.tsx": "",
  })
  expect(paths).toContain("index.tsx")
})

test("returns *.circuit.tsx files", () => {
  const paths = getPossibleEntrypointComponentPaths({
    "a.circuit.tsx": "",
    "b.circuit.tsx": "",
  })
  expect(paths).toEqual(
    expect.arrayContaining(["a.circuit.tsx", "b.circuit.tsx"]),
  )
})

test("returns mainEntrypoint from config", () => {
  const paths = getPossibleEntrypointComponentPaths({
    "tscircuit.config.json": '{"mainEntrypoint": "src/main.tsx"}',
    "src/main.tsx": "",
  })
  expect(paths).toContain("src/main.tsx")
})

test("returns single tsx file if only one", () => {
  const paths = getPossibleEntrypointComponentPaths({
    "only.tsx": "",
  })
  expect(paths).toContain("only.tsx")
})
