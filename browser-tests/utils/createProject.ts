import { createServer } from "http"
import { CircuitRunner } from "lib/runner/CircuitRunner"

let port = 3000

export const createProject = async (fsMap: Record<string, string>) => {
  port++
  const server = createServer(async (req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(`
        <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js"></script>
        <div id="root"></div>
        <script type="module">
          const runner = new CircuitRunner({
            isWebView: true,
          })
          window.runner = runner

          await runner.executeWithFsMap({
            fsMap: ${JSON.stringify(fsMap)},
          })

          runner.render(document.getElementById("root"))
        </script>
      `)
    } else {
      res.writeHead(404)
      res.end("Not Found")
    }
  })

  await new Promise<void>((resolve) => server.listen(port, resolve))

  return {
    project: {
      url: `http://localhost:${port}`,
    },
    log: [],
    server,
  }
}
