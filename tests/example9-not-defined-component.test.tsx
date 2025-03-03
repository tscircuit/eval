import { createCircuitWebWorker } from "lib/index"
import { expect, test } from "bun:test"

test("example9-not-defined-component", async () => {
  const circuitWebWorker = await createCircuitWebWorker({
    webWorkerUrl: new URL("../webworker/index.ts", import.meta.url),
  })

  expect(async () => {
    await circuitWebWorker.execute(`  
        import { A555Timer } from "@tsci/seveibar.a555timer";
    
        circuit.add(
            <board width="10mm" height="10mm">
                <A555Timer name="01" />
            </board>
        );
      `)
  }).toThrowError(
    `Component "A555Timer" is not exported by "@tsci/seveibar.a555timer"`,
  )
})
