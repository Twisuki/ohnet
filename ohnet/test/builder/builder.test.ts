import type { OhNetAdapter, OhNetContext } from "@twisuki/ohnet"
import { createResponse, OhNetBuilder } from "@twisuki/ohnet"
import { afterEach, describe, expect, it, vi } from "vitest"

function recordingAdapter(seen: OhNetContext[]): OhNetAdapter {
  return async (context) => {
    seen.push(context)
    return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
  }
}

function createBuilder(adapter: OhNetAdapter = recordingAdapter([])): OhNetBuilder {
  return new OhNetBuilder({ url: "https://api.example.com", adapter })
}

describe("builder - fork", () => {
  it("returns a new OhNetBuilder instance", () => {
    const parent = createBuilder()
    const child = parent.fork()
    expect(child).not.toBe(parent)
    expect(child).toBeInstanceOf(OhNetBuilder)
  })

  it("applies the override config without mutating the parent", async () => {
    const seen: OhNetContext[] = []
    const parent = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    const child = parent.fork({ url: "https://other.example.com" })

    await child.get()
    expect(seen[0].request.url).toBe("https://other.example.com")
  })

  it("add(config) behaves the same as fork(config)", async () => {
    const seen: OhNetContext[] = []
    const parent = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    const forked = parent.fork({ method: "POST" })
    const added = parent.add({ method: "POST" })

    await forked.request()
    await added.request()
    expect(seen[0].request.method).toBe("POST")
    expect(seen[1].request.method).toBe("POST")
  })
})

describe("builder - getters", () => {
  it("exposes the middleware builder", () => {
    const builder = createBuilder()
    expect(builder.middleware.has("missing")).toBe(false)
    expect(builder.middleware.list()).toEqual([])
  })

  it("exposes the event builder", () => {
    const builder = createBuilder()
    expect(builder.event.list()).toEqual([])
  })
})

describe("builder - append and HTTP verbs", () => {
  it("appends the path to the base url", async () => {
    const seen: OhNetContext[] = []
    const builder = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    await builder.append("/users").get()
    expect(seen[0].request.url).toBe("https://api.example.com/users")
  })

  it("the HTTP verb helpers each set the matching request method", async () => {
    const seen: OhNetContext[] = []
    const builder = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    await builder.get("/a")
    await builder.post("/b")
    await builder.put("/c")
    await builder.delete("/d")
    await builder.patch("/e")
    await builder.head("/f")
    await builder.options("/g")

    expect(seen.map(c => c.request.method)).toEqual([
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ])
  })

  it("get forwards path, params, and body to the request", async () => {
    const seen: OhNetContext[] = []
    const builder = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    await builder.get("/items", { page: 2 }, { trace: "x" })
    expect(seen[0].request.params).toEqual({ page: 2 })
    expect(seen[0].request.data).toEqual({ trace: "x" })
  })
})

describe("builder - default adapter", () => {
  let originalFetch: typeof globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("falls back to fetchAdapter when no adapter is passed", async () => {
    originalFetch = globalThis.fetch
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{\"ok\":true}", { status: 200, headers: { "content-type": "application/json" } }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const data = await new OhNetBuilder({ url: "https://api.example.com/v1" }).get()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/v1")
    expect(data).toEqual({ ok: true })
  })

  it("uses the explicit adapter when one is passed and skips fetchAdapter", async () => {
    originalFetch = globalThis.fetch
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const seen: OhNetContext[] = []
    await new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    }).get()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(seen).toHaveLength(1)
  })

  it("inherits the parent's adapter through fork", async () => {
    originalFetch = globalThis.fetch
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{\"ok\":true}", { status: 200, headers: { "content-type": "application/json" } }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const child = new OhNetBuilder({ url: "https://api.example.com" }).fork()
    await child.get()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not invoke the default adapter at construction time", () => {
    originalFetch = globalThis.fetch
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const builder = new OhNetBuilder({ url: "https://api.example.com" })
    expect(builder).toBeInstanceOf(OhNetBuilder)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
