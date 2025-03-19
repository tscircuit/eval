import { readFileSync, writeFileSync } from "node:fs"

function createWorkerBlobCode(jsCode: string) {
  // Convert the code to Base64 to avoid issues with special characters and newlines
  const encodedCode = Buffer.from(jsCode).toString("base64")

  // Create code that will construct a Blob URL from the Base64-encoded JavaScript
  const blobCode = `
    const decodedCode = atob("${encodedCode}")
    const blob = new Blob([decodedCode], { type: "application/javascript" })
    const blobUrl = URL.createObjectURL(blob)
    export default blobUrl
  `

  return blobCode
}

// Generate the .d.ts file content
const typeDefinition = `declare const blobUrl: string
export default blobUrl
`

const workerCode = readFileSync("./dist/webworker/entrypoint.js", "utf-8")
const blobConstructorCode = createWorkerBlobCode(workerCode)

writeFileSync("./dist/blob-url.js", blobConstructorCode)
writeFileSync("./dist/blob-url.d.ts", typeDefinition)
