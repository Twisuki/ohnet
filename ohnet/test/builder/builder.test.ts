import type { OhNetAdapter, OhNetContext } from "@twisuki/ohnet"
import { createResponse, OhNetBuilder } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

function recordingAdapter(seen: OhNetContext[]): OhNetAdapter {
  return async (context) => {
    seen.push(context)
    return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
  }
}

function createBuilder(adapter: OhNetAdapter = recordingAdapter([])): OhNetBuilder {
  return new OhNetBuilder({ url: "https://api.example.com", adapter })
}

describe("ohNetBuilder.fork", () => {
  it("returns a new OhNetBuilder instance", () => {
    const parent = createBuilder()
    const child = parent.fork()
    expect(child).not.toBe(parent)
    expect(child).toBeInstanceOf(OhNetBuilder)
  })

  it("child does not mutate the parent — config applied only to the child", async () => {
    const seen: OhNetContext[] = []
    const parent = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    const child = parent.fork({ url: "https://other.example.com" })

    await child.get()
    expect(seen[0].request.url).toBe("https://other.example.com")
  })

  it("add forwards to fork(config)", async () => {
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

describe("ohNetBuilder getters", () => {
  it("get middleware exposes the middleware builder", () => {
    const builder = createBuilder()
    expect(builder.middleware.has("missing")).toBe(false)
    expect(builder.middleware.list()).toEqual([])
  })

  it("get event exposes the event builder", () => {
    const builder = createBuilder()
    expect(builder.event.list()).toEqual([])
  })
})

describe("ohNetBuilder.append + HTTP verbs", () => {
  it("appends the path to the request url", async () => {
    const seen: OhNetContext[] = []
    const builder = new OhNetBuilder({
      url: "https://api.example.com",
      adapter: recordingAdapter(seen),
    })
    await builder.append("/users").get()
    expect(seen[0].request.url).toBe("https://api.example.com/users")
  })

  it("hTTP verbs set the correct method on the request", async () => {
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

  it("verb accepts GET with params and body", async () => {
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
