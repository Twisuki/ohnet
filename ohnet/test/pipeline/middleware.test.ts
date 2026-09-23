import type { OhNetAdapter, OhNetContext, OhNetMiddleware } from "@twisuki/ohnet"
import { createResponse, OhNetBuilder } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

function middleware(
  name: string,
  hooks: Omit<Partial<OhNetMiddleware>, "name">,
): OhNetMiddleware {
  return { name, ...hooks }
}

function createBuilder(adapter?: OhNetAdapter): OhNetBuilder {
  return new OhNetBuilder({
    url: "https://example.com",
    adapter: adapter ?? (async () => createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" })),
  })
}

describe("builder run · middleware flow", () => {
  it("runs without middlewares and returns the response data", async () => {
    await expect(createBuilder().get()).resolves.toBe("ok")
  })

  it("runs observe-only middlewares without affecting the response", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(middleware("enter-only", { async enter() { log.push("enter") } }))
      .with(middleware("leave-only", { async leave() { log.push("leave") } }))
    await expect(builder.get()).resolves.toBe("ok")
    expect(log).toEqual(["enter", "leave"])
  })

  it("runs enter in registration order and leave in reverse order across multiple middlewares", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(middleware("a", {
        async enter() { log.push("enter:a") },
        async leave() { log.push("leave:a") },
      }))
      .with(middleware("b", {
        async enter() { log.push("enter:b") },
        async leave() { log.push("leave:b") },
      }))
      .with(middleware("c", {
        async enter() { log.push("enter:c") },
        async leave() { log.push("leave:c") },
      }))
    await builder.get()
    expect(log).toEqual([
      "enter:a",
      "enter:b",
      "enter:c",
      "leave:c",
      "leave:b",
      "leave:a",
    ])
  })

  it("lets middlewares mutate the request — headers flow downstream to the adapter", async () => {
    const seen: { auth: string | null }[] = []
    const builder = new OhNetBuilder({
      url: "https://example.com",
      adapter: async (context: OhNetContext) => {
        seen.push({ auth: context.request.headers.get("authorization") })
        return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
      },
    })
    await builder.with(middleware("add-auth", {
      async enter(_adapter, context) {
        context.request.headers.append("authorization", "Bearer x")
      },
    })).get()
    expect(seen[0].auth).toBe("Bearer x")
  })

  it("lets middlewares write context.meta — subsequent middlewares can read it", async () => {
    const seen: Record<string, unknown>[] = []
    const builder = createBuilder()
      .with(middleware("writer", {
        async enter(_adapter, context) {
          context.meta.traceId = "abc123"
        },
      }))
      .with(middleware("reader", {
        async enter(_adapter, context) {
          seen.push({ traceId: context.meta.traceId })
        },
      }))
    await builder.get()
    expect(seen[0].traceId).toBe("abc123")
  })
})
