import { test, expect } from "@playwright/test"
import { createProject } from "./utils/createProject"

const tsconfig = {
  compilerOptions: {
    paths: {
      "@/*": ["lib/*"],
    },
  },
}

test("should support tsconfig paths", async ({ page }) => {
  const { project, log } = await createProject({
    "tsconfig.json": JSON.stringify(tsconfig),
    "lib/x.tsx": `export const X = () => <div>hello world</div>`,
    "index.tsx": `
      import { X } from "@/x"

      circuit.add(<X />)
    `,
  })

  await page.goto(project.url)

  await expect(page.locator("text=hello world")).toBeVisible()
})
