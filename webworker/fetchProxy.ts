export const setupFetchProxy = () => {
  const pendingRequests = new Map<
    number,
    { resolve: (value: Response) => void; reject: (reason: any) => void }
  >()
  let requestCounter = 0

  function fetchProxy(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const requestId = ++requestCounter
    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject })
      let url: string
      let requestInit: any = init ? { ...init } : {}

      if (typeof input === "string" || input instanceof URL) {
        url = input.toString()
      } else {
        url = input.url
        requestInit = {
          ...requestInit,
          method: input.method,
          headers: Object.fromEntries(input.headers.entries()),
          body: input.bodyUsed ? undefined : (input as any).body,
        }
      }

      if (requestInit.headers instanceof Headers) {
        requestInit.headers = Object.fromEntries(requestInit.headers.entries())
      }
      ;(globalThis as any).postMessage({
        type: "worker-fetch",
        requestId,
        input: url,
        init: requestInit,
      })
    })
  }

  function handleMessage(event: MessageEvent) {
    const data = event.data
    if (!data) return

    if (data.type === "override-global-fetch") {
      ;(globalThis as any).fetch = fetchProxy
      return
    }

    if (data.type === "worker-fetch-result") {
      const handlers = pendingRequests.get(data.requestId)
      if (!handlers) return
      pendingRequests.delete(data.requestId)

      if (data.success) {
        const resp = new Response(data.response.body, {
          status: data.response.status,
          statusText: data.response.statusText,
          headers: data.response.headers,
        })
        handlers.resolve(resp)
      } else {
        const err = new Error(data.error.message)
        err.name = data.error.name
        if (data.error.stack) err.stack = data.error.stack
        handlers.reject(err)
      }
    }
  }

  globalThis.addEventListener("message", handleMessage)
}
