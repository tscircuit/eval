import { expect, test } from "bun:test"
import { runTscircuitCode } from "lib/runner"

test("should resolve multiple path aliases", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"],
            "@/*": ["src/*"],
          },
        },
      }),
      "src/components/resistor.tsx": `
        export const Resistor = ({ name, resistance }: { name: string, resistance: string }) => (
          <resistor name={name} resistance={resistance} />
        )
      `,
      "src/utils/constants.ts": `
        export const DEFAULT_RESISTANCE = "1k"
      `,
      "src/config.ts": `
        export const BOARD_WIDTH = "10mm"
      `,
      "main.tsx": `
        import { Resistor } from "@components/resistor"
        import { DEFAULT_RESISTANCE } from "@utils/constants"
        import { BOARD_WIDTH } from "@/config"
        
        export default () => (
          <board width={BOARD_WIDTH} height="10mm">
            <Resistor name="R1" resistance={DEFAULT_RESISTANCE} />
          </board>
        )
      `,
    },
    {
      mainComponentPath: "main.tsx",
    },
  )

  const resistor = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "R1",
  )

  expect(resistor).toBeDefined()
  expect(resistor?.type).toBe("source_component")
})
