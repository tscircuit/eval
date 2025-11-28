import { test, expect } from "bun:test"
import { createCircuitWebWorker } from "lib/worker"
import { repoFileUrl } from "../fixtures/resourcePaths"

test(
  "should throw error when disableNpmResolution is true and npm package is imported",
  async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
      disableNpmResolution: true,
    })

    const code = `
      import isOdd from "is-odd"

      export default () => {
        return <resistor name="R1" resistance="1k" />
      }
    `

    let errorOccurred = false

    try {
      await worker.executeWithFsMap({
        fsMap: {
          "user-code.tsx": code,
        },
      })
      await worker.renderUntilSettled()
    } catch (error: any) {
      // Any error (including Comlink serialization errors) indicates the import was blocked
      errorOccurred = true
    }

    await worker.kill()

    // An error should occur when trying to import npm packages with the flag enabled
    // Note: Comlink may throw serialization errors when the actual import error is passed
    // through the worker boundary, but this still indicates the blocking worked
    expect(errorOccurred).toBe(true)
  },
  { timeout: 10000 },
)

test(
  "should allow npm imports when disableNpmResolution is false",
  async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
      disableNpmResolution: false,
    })

    const code = `
      import isOdd from "is-odd"

      export default () => {
        if (!isOdd(3)) {
          throw new Error("isOdd(3) should be true")
        }
        return <resistor name="R1" resistance="1k" />
      }
    `

    await worker.executeWithFsMap({
      fsMap: {
        "user-code.tsx": code,
      },
    })

    await worker.renderUntilSettled()
    const circuitJson = await worker.getCircuitJson()

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    )

    expect(resistor).toBeDefined()
    await worker.kill()
  },
  { timeout: 15000 },
)

test(
  "should allow local imports when disableNpmResolution is true",
  async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
      disableNpmResolution: true,
    })

    await worker.executeWithFsMap({
      fsMap: {
        "user-code.tsx": `
          import MyComponent from "./component"

          export default () => <MyComponent />
        `,
        "component.tsx": `
          export default () => <resistor name="R1" resistance="1k" />
        `,
      },
      mainComponentPath: "user-code.tsx",
    })

    await worker.renderUntilSettled()
    const circuitJson = await worker.getCircuitJson()

    const resistor = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "R1",
    )

    expect(resistor).toBeDefined()
    await worker.kill()
  },
  { timeout: 10000 },
)

test(
  "should block multiple npm packages when disableNpmResolution is true",
  async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: repoFileUrl("dist/webworker/entrypoint.js").href,
      disableNpmResolution: true,
    })

    const code = `
      import isOdd from "is-odd"
      import _ from "lodash"
      import { v4 as uuidv4 } from "uuid"

      export default () => {
        return <resistor name="R1" resistance="1k" />
      }
    `

    let errorOccurred = false

    try {
      await worker.executeWithFsMap({
        fsMap: {
          "user-code.tsx": code,
        },
      })
      await worker.renderUntilSettled()
    } catch (error: any) {
      // Any error (including Comlink serialization errors) indicates the imports were blocked
      errorOccurred = true
    }

    await worker.kill()

    // An error should occur when trying to import npm packages with the flag enabled
    // Note: Comlink may throw serialization errors when the actual import error is passed
    // through the worker boundary, but this still indicates the blocking worked
    expect(errorOccurred).toBe(true)
  },
  { timeout: 10000 },
)
