import { expect, test } from "bun:test"
import {
  parseTsconfigPaths,
  resolveTsconfigPath,
} from "lib/utils/parse-tsconfig-paths"

test("parseTsconfigPaths - basic parsing", () => {
  const fsMap = {
    "tsconfig.json": `
      {
        "compilerOptions": {
          "baseUrl": ".",
          "paths": {
            "@lib/*": ["lib/*"],
            "@components/*": ["src/components/*"]
          }
        }
      }
    `,
  }

  const result = parseTsconfigPaths(fsMap)
  expect(result).toEqual({
    baseUrl: ".",
    paths: {
      "@lib/*": ["lib/*"],
      "@components/*": ["src/components/*"],
    },
  })
})

test("parseTsconfigPaths - with comments", () => {
  const fsMap = {
    "tsconfig.json": `
      {
        // TypeScript configuration
        "compilerOptions": {
          "baseUrl": ".",
          /* Path mappings */
          "paths": {
            "@lib/*": ["lib/*"] // Library files
          }
        }
      }
    `,
  }

  const result = parseTsconfigPaths(fsMap)
  expect(result).toEqual({
    baseUrl: ".",
    paths: {
      "@lib/*": ["lib/*"],
    },
  })
})

test("parseTsconfigPaths - no paths defined", () => {
  const fsMap = {
    "tsconfig.json": `
      {
        "compilerOptions": {
          "baseUrl": "."
        }
      }
    `,
  }

  const result = parseTsconfigPaths(fsMap)
  expect(result).toEqual({
    baseUrl: ".",
  })
})

test("parseTsconfigPaths - no tsconfig.json", () => {
  const fsMap = {
    "entrypoint.tsx": "const a = 1",
  }

  const result = parseTsconfigPaths(fsMap)
  expect(result).toBeNull()
})

test("parseTsconfigPaths - finds tsconfig in src folder", () => {
  const fsMap = {
    "src/tsconfig.json": `
      {
        "compilerOptions": {
          "baseUrl": "src",
          "paths": {
            "@utils/*": ["utils/*"]
          }
        }
      }
    `,
  }

  const result = parseTsconfigPaths(fsMap)
  expect(result).toEqual({
    baseUrl: "src",
    paths: {
      "@utils/*": ["utils/*"],
    },
  })
})

test("resolveTsconfigPath - basic wildcard resolution", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@lib/*": ["lib/*"],
    },
  }

  const result = resolveTsconfigPath("@lib/utils", tsconfigPaths)
  expect(result).toEqual(["lib/utils"])
})

test("resolveTsconfigPath - multiple path mappings", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@components/*": ["src/components/*", "lib/components/*"],
    },
  }

  const result = resolveTsconfigPath("@components/button", tsconfigPaths)
  expect(result).toEqual(["src/components/button", "lib/components/button"])
})

test("resolveTsconfigPath - nested path", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@lib/*": ["lib/*"],
    },
  }

  const result = resolveTsconfigPath("@lib/components/button", tsconfigPaths)
  expect(result).toEqual(["lib/components/button"])
})

test("resolveTsconfigPath - exact match without wildcard", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@utils": ["src/utils/index"],
    },
  }

  const result = resolveTsconfigPath("@utils", tsconfigPaths)
  expect(result).toEqual(["src/utils/index"])
})

test("resolveTsconfigPath - with baseUrl other than root", () => {
  const tsconfigPaths = {
    baseUrl: "src",
    paths: {
      "@lib/*": ["lib/*"],
    },
  }

  const result = resolveTsconfigPath("@lib/utils", tsconfigPaths)
  expect(result).toEqual(["src/lib/utils"])
})

test("resolveTsconfigPath - no match", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@lib/*": ["lib/*"],
    },
  }

  const result = resolveTsconfigPath("@components/button", tsconfigPaths)
  expect(result).toBeNull()
})

test("resolveTsconfigPath - null paths", () => {
  const result = resolveTsconfigPath("@lib/utils", null)
  expect(result).toBeNull()
})

test("resolveTsconfigPath - special characters in pattern", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "$lib/*": ["lib/*"],
    },
  }

  const result = resolveTsconfigPath("$lib/utils", tsconfigPaths)
  expect(result).toEqual(["lib/utils"])
})

test("resolveTsconfigPath - removes leading ./ from resolved paths", () => {
  const tsconfigPaths = {
    baseUrl: ".",
    paths: {
      "@lib/*": ["./lib/*"],
    },
  }

  const result = resolveTsconfigPath("@lib/utils", tsconfigPaths)
  expect(result).toEqual(["lib/utils"])
})
