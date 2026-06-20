import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent, PcbBoard } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getPlatformConfig } from "lib/getPlatformConfig"
import { CircuitRunner } from "lib/runner/CircuitRunner"
import * as fs from "node:fs"
import * as path from "node:path"
import looksSame from "looks-same"
import { renderGLTFToPNGFromGLB } from "poppygl"
import tl3342FootprintCircuitJson from "tests/fixtures/assets/SW_SPST_TL3342.json"
import { repoFileUrl } from "tests/fixtures/resourcePaths"

const tl3342CircuitJsonUrl =
  "https://kicad-mod-cache.tscircuit.com/Button_Switch_SMD/SW_SPST_TL3342.circuit.json"
const tl3342WrlUrl =
  "https://kicad-mod-cache.tscircuit.com/Button_Switch_SMD/SW_SPST_TL3342.wrl"
const tl3342StepUrl =
  "https://kicad-mod-cache.tscircuit.com/Button_Switch_SMD/SW_SPST_TL3342.step"

const ACCEPTABLE_DIFF_FRACTION = 0.01

const getSimple3dSnapshotPath = (testPath: string) => {
  const normalizedTestPath = testPath.replace(/\.test\.tsx?$/, "")
  const snapshotDir = path.join(
    path.dirname(normalizedTestPath),
    "__snapshots__",
  )
  const snapshotName = `${path.basename(normalizedTestPath)}-simple-3d.snap.png`
  return path.join(snapshotDir, snapshotName)
}

const renderCircuitJsonTo3dPng = async (
  circuitJson: AnyCircuitElement[],
): Promise<Buffer> => {
  const glb = await convertCircuitJsonToGltf(circuitJson, {
    boardTextureResolution: 512,
    includeModels: true,
    showBoundingBoxes: false,
    format: "glb",
  })

  if (
    !(
      glb instanceof Uint8Array ||
      Buffer.isBuffer(glb) ||
      glb instanceof ArrayBuffer
    )
  ) {
    throw new Error(
      `circuit-json-to-gltf did not produce a GLB file. Received type: ${
        (glb as any)?.constructor?.name ?? typeof glb
      }`,
    )
  }

  const board = circuitJson.find(
    (element): element is PcbBoard => element.type === "pcb_board",
  )

  const camPos: readonly [number, number, number] | undefined =
    board?.width && board?.height
      ? [board.width / 2, (board.width + board.height) / 2, board.height / 2]
      : undefined

  const png = await renderGLTFToPNGFromGLB(
    Buffer.from(glb as any),
    {
      width: 1024,
      height: 1024,
      lookAt: [0, 0, 0],
      backgroundColor: [0, 0, 0],
      grid: {
        cellSize: 1,
        color: [128, 128, 128],
        infiniteGrid: true,
      },
      ...(camPos ? { camPos } : {}),
    },
  )

  return Buffer.isBuffer(png) ? png : Buffer.from(png)
}

const expectCircuitJsonToMatchSimple3dSnapshot = async (
  circuitJson: AnyCircuitElement[],
  testPath: string,
) => {
  const snapshotPath = getSimple3dSnapshotPath(testPath)
  const snapshotDir = path.dirname(snapshotPath)
  const content = await renderCircuitJsonTo3dPng(circuitJson)
  const updateSnapshot = Boolean(process.env.BUN_UPDATE_SNAPSHOTS)

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true })
  }

  if (!fs.existsSync(snapshotPath) || updateSnapshot) {
    fs.writeFileSync(snapshotPath, content)
    return
  }

  const existingSnapshot = fs.readFileSync(snapshotPath)
  const comparison = await looksSame(content, existingSnapshot, {
    strict: false,
    tolerance: 7,
    ignoreAntialiasing: true,
    antialiasingTolerance: 4,
    shouldCluster: true,
    clustersSize: 10,
    createDiffImage: true,
  })

  if (comparison.equal) return

  let areaOfDiffClusters = 0
  for (const cluster of comparison.diffClusters) {
    areaOfDiffClusters +=
      (cluster.right - cluster.left) * (cluster.bottom - cluster.top)
  }

  const diffFraction = areaOfDiffClusters / comparison.totalPixels
  if (diffFraction <= ACCEPTABLE_DIFF_FRACTION) return

  const diffPath = snapshotPath.replace(/\.snap\.png$/, ".diff.png")
  await comparison.diffImage.save(diffPath)
  throw new Error(
    `3D snapshot differs by ${(diffFraction * 100).toFixed(2)}% (> ${(ACCEPTABLE_DIFF_FRACTION * 100).toFixed(2)}%). Diff saved at ${diffPath}`,
  )
}

test("kicad footprint library map returns cadModel for TL3342 footprint", async () => {
  const originalFetch = globalThis.fetch
  const mockFootprintCircuitJson = [
    {
      type: "pcb_silkscreen_text",
      text: "REF**",
      pcb_component_id: "pcb_component_0",
    },
    {
      type: "pcb_silkscreen_text",
      text: "SW_SPST_TL3342",
      pcb_component_id: "pcb_component_0",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      port_hints: ["pin1"],
    },
  ]

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    expect(String(input)).toBe(tl3342CircuitJsonUrl)

    return new Response(JSON.stringify(mockFootprintCircuitJson), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch

  try {
    const platformConfig = getPlatformConfig()
    const kicadLoader = platformConfig.footprintLibraryMap?.kicad as (
      footprintName: string,
    ) => Promise<any>

    const result = await kicadLoader("Button_Switch_SMD/SW_SPST_TL3342")

    expect(result).toBeDefined()
    expect(result.footprintCircuitJson).toEqual([
      mockFootprintCircuitJson[0],
      mockFootprintCircuitJson[2],
    ])
    expect(result.cadModel.wrlUrl).toBe(tl3342WrlUrl)
    expect(result.cadModel.stepUrl).toBe(tl3342StepUrl)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test(
  "kicad footprint library map renders TL3342 3d snapshot with cad model",
  async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input)

      if (url === tl3342CircuitJsonUrl) {
        return new Response(JSON.stringify(tl3342FootprintCircuitJson), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }

      if (url === tl3342StepUrl) {
        return new Response(
          Bun.file(
            repoFileUrl("tests/fixtures/assets/models/SW_SPST_TL3342.step"),
          ),
          {
            status: 200,
            headers: {
              "content-type": "application/step",
            },
          },
        )
      }

      return originalFetch(input, init)
    }) as typeof fetch

    const runner = new CircuitRunner({
      platform: getPlatformConfig(),
    })

    try {
      await runner.execute(`
        circuit.add(
          <board width="14mm" height="12mm" routingDisabled>
            <pushbutton
              name="SW1"
              footprint="kicad:Button_Switch_SMD/SW_SPST_TL3342"
            />
          </board>
        )
      `)

      await runner.renderUntilSettled()

      const circuitJson = await runner.getCircuitJson()
      const loadErrors = circuitJson.filter(
        (el) => el.type === "external_footprint_load_error",
      )
      const ambiguousErrors = circuitJson.filter(
        (el) => el.type === "source_ambiguous_port_reference",
      )
      const cadComponent = circuitJson.find(
        (el): el is CadComponent => el.type === "cad_component",
      )

      expect(loadErrors).toHaveLength(0)
      expect(ambiguousErrors).toHaveLength(0)
      expect(cadComponent?.model_step_url).toBe(tl3342StepUrl)
      expect(cadComponent?.model_wrl_url).toBe(tl3342WrlUrl)

      expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
        import.meta.path,
      )
      await expectCircuitJsonToMatchSimple3dSnapshot(
        circuitJson,
        import.meta.path,
      )
    } finally {
      globalThis.fetch = originalFetch
      await runner.kill()
    }
  },
  30 * 1000,
)
