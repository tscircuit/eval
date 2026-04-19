const getRequestUrl = (requestInput: RequestInfo | URL): string => {
  if (typeof requestInput === "string" || requestInput instanceof URL) {
    return requestInput.toString()
  }
  return requestInput.url
}

const getRequestMethod = (
  requestInput: RequestInfo | URL,
  requestInit?: RequestInit,
): string => {
  if (requestInit?.method) return requestInit.method
  if (requestInput instanceof Request) return requestInput.method
  return "GET"
}

const getRequestBody = async (params: {
  requestInput: RequestInfo | URL
  requestInit?: RequestInit
  requestMethod: string
}) => {
  const { requestInput, requestInit, requestMethod } = params
  const upperMethod = requestMethod.toUpperCase()
  if (upperMethod === "GET" || upperMethod === "HEAD") return undefined

  if (requestInit?.body !== undefined) return requestInit.body
  if (requestInput instanceof Request)
    return await requestInput.clone().arrayBuffer()

  return undefined
}

const getHostFromOrigin = (origin: string | null): string | undefined => {
  if (!origin) return undefined

  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}

const shouldProxyEasyEdaRequest = (targetUrl: string): boolean => {
  if (typeof globalThis.location === "undefined") return false

  try {
    const parsedUrl = new URL(targetUrl)
    return (
      parsedUrl.hostname === "easyeda.com" ||
      parsedUrl.hostname.endsWith(".easyeda.com")
    )
  } catch {
    return false
  }
}

const getProxyUrl = (apiBaseUrl: string) =>
  `${apiBaseUrl.replace(/\/$/, "")}/proxy`

export const createEasyEdaAwarePlatformFetch = (
  apiBaseUrl: string,
): typeof fetch => {
  const easyEdaProxyUrl = getProxyUrl(apiBaseUrl)
  const wrappedFetch = async (
    requestInput: RequestInfo | URL,
    requestInit?: RequestInit,
  ) => {
    const targetUrl = getRequestUrl(requestInput)

    if (!shouldProxyEasyEdaRequest(targetUrl)) {
      return globalThis.fetch(requestInput, requestInit)
    }

    const requestMethod = getRequestMethod(requestInput, requestInit)
    const requestBody = await getRequestBody({
      requestInput,
      requestInit,
      requestMethod,
    })

    const proxyHeaders = new Headers(
      requestInit?.headers ??
        (requestInput instanceof Request ? requestInput.headers : undefined),
    )

    const senderOrigin =
      proxyHeaders.get("origin") ??
      (typeof globalThis.location !== "undefined" &&
      globalThis.location.origin !== "null"
        ? globalThis.location.origin
        : null)

    const senderHost =
      proxyHeaders.get("authority") ??
      proxyHeaders.get("host") ??
      getHostFromOrigin(senderOrigin) ??
      (typeof globalThis.location !== "undefined"
        ? globalThis.location.host
        : undefined)

    const senderReferer =
      proxyHeaders.get("referer") ??
      (typeof globalThis.location !== "undefined"
        ? globalThis.location.href
        : undefined)

    const senderUserAgent =
      proxyHeaders.get("user-agent") ??
      (typeof globalThis.navigator !== "undefined"
        ? globalThis.navigator.userAgent
        : undefined)

    const senderCookie = proxyHeaders.get("cookie")

    proxyHeaders.delete("origin")
    proxyHeaders.delete("authority")
    proxyHeaders.delete("host")
    proxyHeaders.delete("referer")
    proxyHeaders.delete("user-agent")
    proxyHeaders.delete("cookie")

    proxyHeaders.set("X-Target-Url", targetUrl)

    if (senderOrigin) proxyHeaders.set("X-Sender-Origin", senderOrigin)
    if (senderHost) proxyHeaders.set("X-Sender-Host", senderHost)
    if (senderReferer) proxyHeaders.set("X-Sender-Referer", senderReferer)
    if (senderUserAgent) {
      proxyHeaders.set("X-Sender-User-Agent", senderUserAgent)
    }
    if (senderCookie) proxyHeaders.set("X-Sender-Cookie", senderCookie)

    return globalThis.fetch(easyEdaProxyUrl, {
      method: requestMethod,
      headers: proxyHeaders,
      body: requestBody,
      credentials: "include",
      signal: requestInit?.signal,
    })
  }

  const typedWrappedFetch = wrappedFetch as typeof fetch

  if ("preconnect" in globalThis.fetch) {
    typedWrappedFetch.preconnect = globalThis.fetch.preconnect.bind(
      globalThis.fetch,
    )
  }

  return typedWrappedFetch
}
