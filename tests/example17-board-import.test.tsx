import { runTscircuitCode } from "lib/runner"
import { expect, test } from "bun:test"

test("imported board should not create extra board", async () => {
  const circuitJson = await runTscircuitCode(
    {
      "board.tsx": `
        export const MyBoard = () => (
          <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" />
          </board>
        )
      `,
      "user-code.tsx": `
        import { MyBoard } from "./board"
        export default MyBoard
      `,
    },
    {
      mainComponentPath: "user-code",
    },
  )

  const pcbBoards = circuitJson.filter((el: any) => el.type === "pcb_board")
  expect(pcbBoards.length).toBe(1)
})
