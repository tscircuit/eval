import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

const workerUrl = new URL("../../webworker/entrypoint.ts", import.meta.url)

test("import type does not trigger circular dependency detection", async () => {
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
        import { ComponentB } from "./ComponentB"

        export type ComponentAProps = { message: string }

        export const ComponentA = ({ message }: ComponentAProps) => (
          <ComponentB message={message} />
        )
      `,
      "ComponentB.tsx": `
        import type { ComponentAProps } from "./ComponentA"

        export const ComponentB = ({ message }: ComponentAProps) => {
          void message
          return null
        }
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  await expect(execution).resolves.toBeUndefined()

  await worker.kill()
})
