import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

const workerUrl = new URL("../../webworker/entrypoint.ts", import.meta.url)

test("detects circular dependencies between local files", async () => {
  const worker = await createCircuitWebWorker({
    webWorkerUrl: workerUrl,
  })

  const execution = worker.executeWithFsMap({
    fsMap: {
      "entrypoint.tsx": `
        import { ComponentA } from "./ComponentA"

        circuit.add(<ComponentA />)
      `,
      "ComponentA.tsx": `
        import { ComponentB } from "./ComponentB"

        export const ComponentA = () => <ComponentB />
      `,
      "ComponentB.tsx": `
        import { ComponentA } from "./ComponentA"

        export const ComponentB = () => <ComponentA />
      `,
    },
    entrypoint: "entrypoint.tsx",
  })

  let capturedError: unknown
  try {
    await execution
  } catch (error) {
    capturedError = error
  } finally {
    await worker.kill()
  }

  expect(capturedError).toBeDefined()
  expect(capturedError).toBeInstanceOf(Error)
  const errorMessage = (capturedError as Error).message
  expect(errorMessage).toContain(
    'Circular dependency detected while importing "ComponentA.tsx"',
  )
  expect(errorMessage).toContain(
    "ComponentA.tsx -> ComponentB.tsx -> ComponentA.tsx",
  )
})
