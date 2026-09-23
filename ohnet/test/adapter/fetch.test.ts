import type { OhNetContext, OhNetSignal } from "@twisuki/ohnet"
import { OHNET_ERROR_CODE, OhNetController, OhNetHeader } from "@twisuki/ohnet"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchAdapter } from "@/adapter/fetch"

function createContext(overrides: Partial<{
  url: string
  method: string
  headers: OhNetHeader
  params: unknown
  data: unknown
  signal: OhNetSignal
  timeout: number
  responseType: "auto" | "json" | "text" | "arraybuffer" | "blob" | "stream" | "raw"
}> = {}): OhNetContext {
  return {
    request: {
      url: overrides.url ?? "https://example.com",
      method: (overrides.method as OhNetContext["request"]["method"]) ?? "GET",
      headers: overrides.headers ?? new OhNetHeader(),
      params: overrides.params as OhNetContext["request"]["params"],
      data: overrides.data,
      signal: overrides.signal,
      timeout: overrides.timeout,
      responseType: overrides.responseType ?? "auto",
    },
    response: null,
    error: null,
    meta: {},
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    ...init,
  })
}

describe("fetchAdapter - fetch availability", () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("throws OHNET_NO_FETCH when globalThis.fetch is not a function", async () => {
    delete (globalThis as { fetch?: typeof fetch }).fetch
    await expect(fetchAdapter(createContext())).rejects.toMatchObject({
      code: OHNET_ERROR_CODE.NO_FETCH,
      name: "Error",
    })
  })
})

describe("fetchAdapter - request execution", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("issues a fetch with the request url, method, and headers", async () => {
    const headers = new OhNetHeader({ "x-trace": "abc" })
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await fetchAdapter(createContext({ url: "https://api.example.com/v1", method: "GET", headers }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe("https://api.example.com/v1")
    expect(calledInit.method).toBe("GET")
    expect(calledInit.headers).toMatchObject({ "x-trace": "abc" })
  })

  it("serializes plain objects as JSON and sets content-type when missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await fetchAdapter(createContext({ data: { foo: 1 } }))

    const [, calledInit] = fetchMock.mock.calls[0]
    expect(calledInit.headers["content-type"]).toBe("application/json")
    expect(calledInit.body).toBe("{\"foo\":1}")
  })

  it("serializes arrays as JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await fetchAdapter(createContext({ data: [1, 2, 3] }))

    const [, calledInit] = fetchMock.mock.calls[0]
    expect(calledInit.body).toBe("[1,2,3]")
  })

  it("passes a string body through without serialization", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await fetchAdapter(createContext({ data: "raw" }))
    expect(fetchMock.mock.calls[0][1].body).toBe("raw")
  })

  it("passes a number body through without serialization", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await fetchAdapter(createContext({ data: 42 }))
    expect(fetchMock.mock.calls[0][1].body).toBe(42)
  })

  it("passes a null body through without serialization", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await fetchAdapter(createContext({ data: null }))
    expect(fetchMock.mock.calls[0][1].body).toBeNull()
  })

  it("preserves an existing content-type header without overwriting", async () => {
    const headers = new OhNetHeader({ "content-type": "text/plain" })
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await fetchAdapter(createContext({ headers, data: { foo: 1 } }))

    const [, calledInit] = fetchMock.mock.calls[0]
    expect(calledInit.headers["content-type"]).toBe("text/plain")
  })

  it("parses response as JSON when responseType is 'json'", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ a: 1 }))

    const response = await fetchAdapter(createContext({ responseType: "json" }))

    expect(response.data).toEqual({ a: 1 })
  })

  it("parses response as text when responseType is 'text'", async () => {
    fetchMock.mockResolvedValueOnce(new Response("hello", { status: 200 }))

    const response = await fetchAdapter(createContext({ responseType: "text" }))

    expect(response.data).toBe("hello")
  })

  it("parses response as ArrayBuffer when responseType is 'arraybuffer'", async () => {
    const bytes = new TextEncoder().encode("abc").buffer
    fetchMock.mockResolvedValueOnce(new Response(bytes, { status: 200 }))

    const response = await fetchAdapter(createContext({ responseType: "arraybuffer" }))

    expect(response.data).toBeInstanceOf(ArrayBuffer)
  })

  it("parses response as Blob when responseType is 'blob'", async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Blob(["x"]), { status: 200 }))

    const response = await fetchAdapter(createContext({ responseType: "blob" }))

    expect(response.data).toBeInstanceOf(Blob)
  })

  it("returns the raw Response when responseType is 'raw'", async () => {
    const original = new Response("body", { status: 200 })
    fetchMock.mockResolvedValueOnce(original)

    const response = await fetchAdapter(createContext({ responseType: "raw" }))

    expect(response.data).toBe(original)
  })

  it("exposes response.body as the stream when responseType is 'stream'", async () => {
    const original = new Response("body", { status: 200 })
    fetchMock.mockResolvedValueOnce(original)

    const response = await fetchAdapter(createContext({ responseType: "stream" }))

    expect(response.data).toBe(original.body)
  })

  it("defaults to JSON parsing when content-type is application/json", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ x: 1 }))

    const response = await fetchAdapter(createContext())

    expect(response.data).toEqual({ x: 1 })
  })

  it("defaults to text when content-type is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html/>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }))

    const response = await fetchAdapter(createContext())

    expect(response.data).toBe("<html/>")
  })

  it("throws OHNET_TIMEOUT when the timeout fires before fetch rejects", async () => {
    vi.useFakeTimers()
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" })
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(abortError))
    }))

    const promise = fetchAdapter(createContext({ timeout: 100 })).catch(e => e)
    await vi.advanceTimersByTimeAsync(100)
    await expect(promise).resolves.toMatchObject({ code: OHNET_ERROR_CODE.TIMEOUT })
    vi.useRealTimers()
  })

  it("throws OHNET_ABORT when the user signal aborts and fetch rejects", async () => {
    const controller = new AbortController()
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" })
    fetchMock.mockImplementationOnce(async () => {
      controller.abort()
      throw abortError
    })

    await expect(fetchAdapter(createContext({ signal: controller.signal })))
      .rejects
      .toMatchObject({ code: OHNET_ERROR_CODE.ABORT })
  })

  it("throws OHNET_NETWORK when fetch rejects for other reasons", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"))

    await expect(fetchAdapter(createContext()))
      .rejects
      .toMatchObject({ code: OHNET_ERROR_CODE.NETWORK })
  })

  it("builds the OhNetResponse with status, statusText, headers, and ok from the fetch Response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("hi", {
      status: 201,
      statusText: "Created",
      headers: { "x-tag": "yes", "content-type": "text/plain" },
    }))

    const response = await fetchAdapter(createContext({ url: "https://example.com/r" }))

    expect(response.status).toBe(201)
    expect(response.statusText).toBe("Created")
    expect(response.headers.get("x-tag")).toBe("yes")
    expect(response.ok).toBe(true)
  })

  it("forwards the user signal abort into the internal AbortController", async () => {
    const controller = new OhNetController()
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" })
    fetchMock.mockImplementationOnce(async (_url, init) => {
      init?.signal?.addEventListener("abort", () => {})
      controller.abort("user-cancel")
      throw abortError
    })

    await expect(fetchAdapter(createContext({ signal: controller.signal })))
      .rejects
      .toMatchObject({ code: OHNET_ERROR_CODE.ABORT })
  })

  it("clears the timeout after fetch resolves", async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, "clearTimeout")
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await fetchAdapter(createContext({ timeout: 5000 }))

    expect(clearSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
