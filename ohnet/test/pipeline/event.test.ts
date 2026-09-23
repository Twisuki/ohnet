import type { OhNetContext } from "@twisuki/ohnet"
import { createResponse, OHNET_EVENT, OhNetBuilder } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

function createBuilder() {
  return new OhNetBuilder({
    url: "https://example.com",
    adapter: async () => createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" }),
  })
}

describe("builder run - event lifecycle", () => {
  it("fires start, request, response, success, finish in order on success", async () => {
    const order: string[] = []
    const builder = createBuilder()
      .on(OHNET_EVENT.START, () => order.push("start"))
      .on(OHNET_EVENT.REQUEST, () => order.push("request"))
      .on(OHNET_EVENT.RESPONSE, () => order.push("response"))
      .on(OHNET_EVENT.SUCCESS, () => order.push("success"))
      .on(OHNET_EVENT.FINISH, () => order.push("finish"))
    await builder.get()
    expect(order).toEqual(["start", "request", "response", "success", "finish"])
  })

  it("passes (adapter, context) to every handler", async () => {
    let capturedAdapter: unknown = null
    let capturedContext: unknown = null
    const builder = createBuilder()
      .on(OHNET_EVENT.REQUEST, (adapter, context) => {
        capturedAdapter = adapter
        capturedContext = context
      })
    await builder.get()
    expect(typeof capturedAdapter).toBe("function")
    expect(capturedContext).toBeDefined()
  })

  it("start handler sees an empty context (response=null, error=null)", async () => {
    let snapshot: { response: unknown, error: unknown } | undefined
    const builder = createBuilder()
      .on(OHNET_EVENT.START, (_adapter, context) => {
        // explicit snapshot: the context reference mutates later as the pipeline runs.
        snapshot = {
          response: context.response,
          error: context.error,
        }
      })
    await builder.get()
    expect(snapshot).toBeDefined()
    expect(snapshot!.response).toBeNull()
    expect(snapshot!.error).toBeNull()
  })

  it("response handler sees the populated response", async () => {
    let snapshot: OhNetContext | undefined
    const builder = createBuilder()
      .on(OHNET_EVENT.RESPONSE, (_adapter, context) => {
        snapshot = context
      })
    await builder.get()
    expect(snapshot).toBeDefined()
    expect(snapshot!.response).toBeDefined()
    expect(snapshot!.response!.data).toBe("ok")
  })

  it("finish is always the last event after response", async () => {
    const order: string[] = []
    const builder = createBuilder()
      .on(OHNET_EVENT.RESPONSE, () => order.push("response"))
      .on(OHNET_EVENT.FINISH, () => order.push("finish"))
    await builder.get()
    expect(order).toEqual(["response", "finish"])
  })

  it("does not fire error on a successful run", async () => {
    let errorCalled = false
    const builder = createBuilder()
      .on(OHNET_EVENT.ERROR, () => {
        errorCalled = true
      })
    await builder.get()
    expect(errorCalled).toBe(false)
  })

  it("runs multiple handlers on the same event in registration order", async () => {
    const order: string[] = []
    const builder = createBuilder()
      .on(OHNET_EVENT.START, () => order.push("a"))
      .on(OHNET_EVENT.START, () => order.push("b"))
      .on(OHNET_EVENT.START, () => order.push("c"))
    await builder.get()
    expect(order).toEqual(["a", "b", "c"])
  })
})

describe("builder run - skip result event", () => {
  it("fires skip when a middleware skips without a response", async () => {
    const log: string[] = []
    const skipper = {
      name: "skipper",
      async enter(
        _adapter: unknown,
        _context: unknown,
        controls: { skip: () => void },
      ) {
        controls.skip()
      },
    }
    const builder = createBuilder()
      .on(OHNET_EVENT.SKIP, () => log.push("skip"))
      .on(OHNET_EVENT.SUCCESS, () => log.push("success"))
      .with(skipper as never)
    await builder.get().catch(() => {})
    expect(log).toEqual(["skip"])
  })

  it("prefers success over skip when skip is paired with a response", async () => {
    const log: string[] = []
    const skipperWithResponse = {
      name: "skipper",
      async enter(
        _adapter: unknown,
        context: { response: unknown },
        controls: { skip: () => void },
      ) {
        context.response = createResponse({ status: 200, url: "https://example.com", headers: {}, data: "cached" })
        controls.skip()
      },
    }
    const builder = createBuilder()
      .on(OHNET_EVENT.SKIP, () => log.push("skip"))
      .on(OHNET_EVENT.SUCCESS, () => log.push("success"))
      .with(skipperWithResponse as never)
    await builder.get()
    expect(log).toEqual(["success"])
  })

  it("prefers error over skip when context.error is set", async () => {
    const log: string[] = []
    const failing = {
      name: "failing",
      async enter(_adapter: unknown, context: { error: unknown }, _controls: unknown) {
        context.error = new Error("boom")
      },
    }
    const builder = createBuilder()
      .on(OHNET_EVENT.SKIP, () => log.push("skip"))
      .on(OHNET_EVENT.ERROR, () => log.push("error"))
      .with(failing as never)
    await builder.get().catch(() => {})
    expect(log).toEqual(["error"])
  })
})

describe("builder run - retry events", () => {
  it("fires START once even when middleware retries", async () => {
    let startCount = 0
    const builder = new OhNetBuilder({
      url: "https://example.com",
      adapter: async context =>
        createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" }),
    })
      .on(OHNET_EVENT.START, () => startCount++)
      .with({
        name: "retry",
        async leave(_adapter, _context, controls) {
          controls.retry()
        },
      })
    await builder.get().catch(() => {})
    expect(startCount).toBe(1)
  })

  it("fires RETRY at the top of each retry attempt, not on the first", async () => {
    let retryCount = 0
    const builder = new OhNetBuilder({
      url: "https://example.com",
      middlewareRetries: 2,
      adapter: async context =>
        createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" }),
    })
      .on(OHNET_EVENT.RETRY, () => retryCount++)
      .with({
        name: "retry",
        async leave(_adapter, _context, controls) {
          controls.retry()
        },
      })
    await builder.get().catch(() => {})
    expect(retryCount).toBe(2)
  })

  it("fires REQUEST and RESPONSE once per attempt", async () => {
    let requestCount = 0
    let responseCount = 0
    const builder = new OhNetBuilder({
      url: "https://example.com",
      middlewareRetries: 2,
      adapter: async context =>
        createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" }),
    })
      .on(OHNET_EVENT.REQUEST, () => requestCount++)
      .on(OHNET_EVENT.RESPONSE, () => responseCount++)
      .with({
        name: "retry",
        async leave(_adapter, _context, controls) {
          controls.retry()
        },
      })
    await builder.get().catch(() => {})
    expect(requestCount).toBe(3)
    expect(responseCount).toBe(3)
  })

  it("fires terminal events once on the final attempt", async () => {
    const order: string[] = []
    let calls = 0
    const adapter = async (context: OhNetContext) => {
      calls++
      if (calls === 1) {
        return createResponse({ status: 401, url: context.request.url, headers: {}, data: null })
      }
      return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
    }
    const builder = new OhNetBuilder({ url: "https://example.com", adapter })
      .on(OHNET_EVENT.SUCCESS, () => order.push("success"))
      .on(OHNET_EVENT.ERROR, () => order.push("error"))
      .on(OHNET_EVENT.FINISH, () => order.push("finish"))
      .with({
        name: "auth",
        async leave(_adapter, context, controls) {
          if (context.response?.status === 401) {
            controls.retry()
          }
        },
      })
    await builder.get()
    expect(order).toEqual(["success", "finish"])
  })
})
