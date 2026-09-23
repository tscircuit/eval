import { expect, test } from "bun:test"
import { createCircuitWebWorker } from "lib"

const expectedMessage =
  '"entrypoint": "index.tsx" is set in the runner configuration, entrypoints must contain "circuit.add(...)", you might be looking to use mainComponentPath instead if your file exports a component.'

test("should hint to use mainComponentPath when entrypoint exports a component", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
  })

  try {
    await circuitWebWorker.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
          export default () => (
            <board width="10mm" height="10mm">
              <resistor resistance="1k" footprint="0402" name="E1" />
            </board>
          )
        `,
      },
    })

    const renderError = await circuitWebWorker.renderUntilSettled().then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(renderError).toBeInstanceOf(Error)
    expect((renderError as Error).message).toContain(expectedMessage)
  } finally {
    await circuitWebWorker.kill()
  }
})
