import { createCircuitWebWorker } from "lib/index"
import { expect, test } from "bun:test"

test("example9-not-defined-component", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/entrypoint.ts", import.meta.url),
  })

  expect(async () => {
    await circuitWebWorker.execute(`  
        import { NotExportedComponent } from "@tsci/seveibar.a555timer";
    
        circuit.add(
            <board width="10mm" height="10mm">
                <NotExportedComponent name="01" />
            </board>
        );
      `)
  }).toThrowError(
    `Component "NotExportedComponent" is not exported by "@tsci/seveibar.a555timer"`,
  )

  await circuitWebWorker.kill()
})
