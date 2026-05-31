import JSZip from "jszip"

export interface CapturedTiBridgeRequest {
  pathname: string
  search: string
  method: string
  headers: Headers
  body: string
}

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"])

const MINIMAL_TI_FOOTPRINT = `(footprint "MSP430_Test"
  (layer "F.Cu")
  (attr smd)
  (fp_text reference "REF**" (at 0 -1.5 0) (layer "F.SilkS")
    (effects (font (size 1 1) (thickness 0.15))))
  (fp_text value "MSP430_Test" (at 0 1.5 0) (layer "F.Fab")
    (effects (font (size 1 1) (thickness 0.15))))
  (pad "1" smd rect (at -0.65 0 0) (size 0.5 1.1) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd rect (at 0.65 0 0) (size 0.5 1.1) (layers "F.Cu" "F.Paste" "F.Mask"))
)`

const createMinimalTiKicadArchive = async () => {
  const archive = new JSZip()
  archive.file(
    "KiCADv6/footprints.pretty/MSP430_Test.kicad_mod",
    MINIMAL_TI_FOOTPRINT,
  )

  return Buffer.from(await archive.generateAsync({ type: "uint8array" }))
}

export const getTiBridgeTestServer = async () => {
  const archiveBuffer = await createMinimalTiKicadArchive()
  const capturedRequests: CapturedTiBridgeRequest[] = []

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const requestUrl = new URL(request.url)
      const requestBody = METHODS_WITHOUT_BODY.has(request.method)
        ? ""
        : await request.text()

      capturedRequests.push({
        pathname: requestUrl.pathname,
        search: requestUrl.search,
        method: request.method,
        headers: new Headers(request.headers),
        body: requestBody,
      })

      if (requestUrl.pathname === "/v1/export/kicad") {
        return new Response(new Uint8Array(archiveBuffer), {
          status: 200,
          headers: {
            "content-type": "application/zip",
          },
        })
      }

      return new Response("not-found", { status: 404 })
    },
  })

  return {
    url: `http://127.0.0.1:${server.port}`,
    server,
    capturedRequests,
  }
}
