import { test, expect } from "bun:test"
import { createCircuitWebWorker } from "lib/index"

const example4 = {
  entrypoint: "entrypoint.tsx",
  fsMap: {
    "entrypoint.tsx":
      '\nimport MyCircuit from "./snippet.tsx"\n\ncircuit.add(<MyCircuit />)\n\nconsole.log("rootComponent", circuit._guessRootComponent(), circuit.firstChild)\n',
    "snippet.tsx":
      'import "@tscircuit/core"\nimport { useRedLed } from "@tsci/seveibar.red-led"\nimport { PushButton } from "@tsci/seveibar.push-button"\nimport { useUsbC } from "@tsci/seveibar.smd-usb-c"\n\nexport default () => {\n  const USBC = useUsbC("USBC")\n  const Led = useRedLed("LED")\n  return (\n    <board width="12mm" height="30mm" schAutoLayoutEnabled>\n      <USBC GND="net.GND" pcbY={-10} VBUS1="net.VBUS" />\n      <Led neg="net.GND" pcbY={12} />\n      <PushButto pcbY={0} pin2=".R1 > .pos" pin3="net.VBUS" />\n      <resistor name="R1" footprint="0603" resistance="1k" pcbY={7} />\n      <trace from=".R1 > .neg" to={Led.pos} />\n    </board>\n  )\n}\n',
  },
}

test(
  "example4-root-child-issue",
  async () => {
    const circuitWebWorker = await createCircuitWebWorker({
      webWorkerUrl: new URL("../../webworker/entrypoint.ts", import.meta.url),
    })

    await circuitWebWorker.executeWithFsMap({
      fsMap: example4.fsMap,
      entrypoint: example4.entrypoint,
    })

    await circuitWebWorker.renderUntilSettled()

    const circuitJson = await circuitWebWorker.getCircuitJson()

    const led = circuitJson.find((el: any) => el.name === "LED")
    expect(led).toBeDefined()
    expect(led?.type).toBe("source_component")

    await circuitWebWorker.kill()
  },
  30 * 1000,
)
