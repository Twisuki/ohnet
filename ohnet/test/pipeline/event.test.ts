import type { OhNetContext } from "@twisuki/ohnet"
import { createResponse, OHNET_EVENT, OhNetBuilder } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

function createBuilder() {
  return new OhNetBuilder({
    url: "https://example.com",
    adapter: async () => createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" }),
  })
}

describe("builder run · event lifecycle", () => {
  it("triggers lifecycle events in order on a normal successful run (on_error omitted)", async () => {
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

  it("passes (adapter, context) to handlers", async () => {
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

  it("on_start handler sees an empty context (response=null, error=null)", async () => {
    let snapshot: { response: unknown, error: unknown } | undefined
    const builder = createBuilder()
      .on(OHNET_EVENT.START, (_adapter, context) => {
        // explicit snapshot — the context reference mutates later as the pipeline runs.
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

  it("on_response handler sees the populated response", async () => {
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

  it("on_finish always runs last after on_response", async () => {
    const order: string[] = []
    const builder = createBuilder()
      .on(OHNET_EVENT.RESPONSE, () => order.push("response"))
      .on(OHNET_EVENT.FINISH, () => order.push("finish"))
    await builder.get()
    expect(order).toEqual(["response", "finish"])
  })

  it("does not trigger on_error on a normal successful run", async () => {
    let errorCalled = false
    const builder = createBuilder()
      .on(OHNET_EVENT.ERROR, () => {
        errorCalled = true
      })
    await builder.get()
    expect(errorCalled).toBe(false)
  })

  it("triggers multiple handlers in registration order on the same event", async () => {
    const order: string[] = []
    const builder = createBuilder()
      .on(OHNET_EVENT.START, () => order.push("a"))
      .on(OHNET_EVENT.START, () => order.push("b"))
      .on(OHNET_EVENT.START, () => order.push("c"))
    await builder.get()
    expect(order).toEqual(["a", "b", "c"])
  })

  describe("on_skip result event", () => {
    it("triggers on_skip when a middleware skips without a response", async () => {
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

    it("does not trigger on_skip when skip is paired with a populated response (success wins)", async () => {
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

    it("does not trigger on_skip when context error is set (error wins)", async () => {
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
})
