import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

const workerUrl = new URL("../../webworker/entrypoint.ts", import.meta.url)

test("export type * re-exports do not break evaluation", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: workerUrl,
  })

  const execution = worker.executeWithFsMap({
    fsMap: {
      "entrypoint.tsx": `
        import { ComponentA } from "./ComponentA"

        circuit.add(<ComponentA message="hello" />)
      `,
      "ComponentA.tsx": `
        import type { ComponentProps } from "./component-types"

        export type * from "./component-types"

        export const ComponentA = ({ message }: ComponentProps) => {
          void message
          return null
        }
      `,
      "component-types.ts": `
        export type ComponentProps = { message: string }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await expect(execution).resolves.toBeUndefined()

  await worker.kill()
})
