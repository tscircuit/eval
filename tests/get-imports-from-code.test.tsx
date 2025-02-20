import { getImportsFromCode } from "lib/utils/get-imports-from-code"
import { expect, test } from "bun:test"

test("getImportsFromCode should extract imports correctly", () => {
  const sourceCode = `
    import defaultExport from "./local-module"
    import * as namespace from "./namespace-module"
    import { export1, export2 as alias2 } from "./named-exports"
    import "./side-effect-only"
    import defaultAndNamed, { named1, named2 } from "./mixed"
    import { something } from "@tsci/package"
    import SomeDefault, * as OtherExports from "./combined"
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./local-module",
      "./namespace-module",
      "./named-exports",
      "./side-effect-only",
      "./mixed",
      "@tsci/package",
      "./combined",
    ]
  `)
})

test("getImportsFromCode should handle multiline imports", () => {
  const sourceCode = `
    import {
      export1,
      export2,
      export3 as alias3,
    } from "./multiline"
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./multiline",
    ]
  `)
})

test("getImportsFromCode should handle string literals", () => {
  const sourceCode = `
    // Should handle single and double quotes
    import foo from './single-quotes'
    import bar from "./double-quotes"
    
    // These should not be captured:
    const str = "import foo from 'bar'"
    const template = \`import foo from 'bar'\`
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./single-quotes",
      "./double-quotes",
    ]
  `)
})

test("getImportsFromCode should handle dynamic imports", () => {
  const sourceCode = `
    // Dynamic imports should not be captured
    const module = await import('./dynamic-import')
    const otherModule = import('@tsci/package')
    
    // Only static imports should be captured
    import staticImport from './static-import'
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./static-import",
    ]
  `)
})

test("getImportsFromCode should handle comments and commented imports", () => {
  const sourceCode = `
    // import foo from './commented'
    /* import bar from './also-commented' */
    import actual from './real-import'
    // More comments
    import another from './another-import'
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./real-import",
      "./another-import",
    ]
  `)
})

test("getImportsFromCode should handle default+namespace import syntax", () => {
  const sourceCode = `
    // This is the syntax from example7-import-default-and-namespace.test.tsx
    import DefaultExport, * as AllExports from "./component.tsx"
    
    // Similar variations
    import Default, * as Everything from "./module.js"
    import MyClass, * as Utils from "./utils"
  `
  expect(getImportsFromCode(sourceCode)).toMatchInlineSnapshot(`
    [
      "./component.tsx",
      "./module.js",
      "./utils",
    ]
  `)
})
