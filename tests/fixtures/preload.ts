import { afterEach } from "bun:test"

// Clean up all workers after each test
afterEach(async () => {
  if (globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER) {
    await globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER.kill()
    globalThis.TSCIRCUIT_GLOBAL_CIRCUIT_WORKER = undefined
  }
})
