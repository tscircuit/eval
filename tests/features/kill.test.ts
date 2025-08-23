import { describe, it, expect } from "bun:test"
import { createCircuitWebWorker } from "../lib"

describe("kill method", () => {
  it("should immediately terminate the worker", async () => {
    const worker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../dist/webworker/entrypoint.js", import.meta.url)
        .href,
    })

    // Ensure worker is running
    await worker.execute(`console.log("Worker running");`)

    // Kill the worker
    await worker.kill()

    // Verify worker is terminated by attempting to execute code
    await expect(
      worker.execute(`console.log("Should not execute");`),
    ).rejects.toThrow() // Worker termination should cause execution to fail
  })
})
