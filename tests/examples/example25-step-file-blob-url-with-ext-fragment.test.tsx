import { CircuitRunner, getPlatformConfig } from "lib/index"
import { test, expect } from "bun:test"
import type { CadComponent } from "circuit-json"

test(
  "example25-step-file-blob-url-with-ext-fragment",
  async () => {
    const runner = new CircuitRunner({
      platform: {
        ...getPlatformConfig(),
      },
    })

    // Provide actual STEP file content (simplified header)
    const stepFileContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''), '2;1');
FILE_NAME('test.step', '2024-01-01', (''), (''), '', '', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;`

    await runner.executeWithFsMap({
      entrypoint: "index.tsx",
      fsMap: {
        "index.tsx": `
import testStep from "./test.step"
circuit.add(
  <board width="10mm" height="10mm">
    <chip
      name="U1"
      footprint="soic8"
      cadModel={
        <cadmodel modelUrl={testStep} />
      }
    />
  </board>
)
`,
        "test.step": stepFileContent,
      },
    })

    await runner.renderUntilSettled()

    const circuitJson = await runner.getCircuitJson()
    expect(circuitJson).toBeDefined()

    const cadModel = circuitJson.find(
      (el: any) => el.type === "cad_component",
    ) as CadComponent
    expect(cadModel).toBeDefined()
    expect(cadModel?.type).toBe("cad_component")

    // model_step_url should be set (proves #ext=step fragment detection worked)
    // Note: core strips the fragment after using it for type detection
    expect(cadModel?.model_step_url).toBeDefined()
    expect(cadModel?.model_step_url).toContain("blob:")

    // model_stl_url should NOT be set - this was the bug before the fix
    // (without #ext=step, core would fall back to model_stl_url)
    expect(cadModel?.model_stl_url).toBeUndefined()

    await runner.kill()
  },
  20 * 1000,
)
