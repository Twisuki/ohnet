import type { OhNetAdapter, OhNetMiddleware } from "@twisuki/ohnet"
import { createResponse, OHNET_ERROR_CODE, OhNetBuilder, OhNetError } from "@twisuki/ohnet"
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

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  }
  catch (error) {
    return error instanceof OhNetError ? error.code : "NOT_OHNET_ERROR"
  }
}

describe("builder run - skip semantics", () => {
  it("throws SKIPPED when a middleware skips without a response", async () => {
    const builder = createBuilder().with(middleware("skipper", {
      async enter(_adapter, _context, controls) { controls.skip() },
    }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.SKIPPED)
  })

  it("returns the response data when skip is paired with a response", async () => {
    const builder = createBuilder().with(middleware("skipper", {
      async enter(_adapter, context, controls) {
        context.response = createResponse({ status: 200, url: "https://example.com", headers: {}, data: "cached" })
        controls.skip()
      },
    }))
    await expect(builder.get()).resolves.toBe("cached")
  })

  it("does not enter later middlewares after a skip", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(middleware("skipper", {
        async enter(_adapter, _context, controls) { controls.skip() },
      }))
      .with(middleware("after", {
        async enter() { log.push("after") },
      }))
    await codeOf(builder.get())
    expect(log).toEqual([])
  })
})

describe("builder run - terminate semantics", () => {
  it("throws SKIPPED when enter terminate runs without a response", async () => {
    const builder = createBuilder().with(middleware("terminator", {
      async enter(_adapter, _context, controls) { controls.terminate() },
    }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.SKIPPED)
  })

  it("returns the response data when leave terminate does not block a populated response", async () => {
    const builder = createBuilder().with(middleware("late-leave-terminator", {
      async leave(_adapter, _context, controls) { controls.terminate() },
    }))
    await expect(builder.get()).resolves.toBe("ok")
  })

  it("returns the response data when enter terminate is overridden by a populated response", async () => {
    const builder = createBuilder().with(middleware("terminator-with-response", {
      async enter(_adapter, context, controls) {
        context.response = createResponse({ status: 200, url: "https://example.com", headers: {}, data: "cached" })
        controls.terminate()
      },
    }))
    await expect(builder.get()).resolves.toBe("cached")
  })

  it("skips the leave chain when enter calls terminate (the skip/terminate difference)", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(middleware("terminator", {
        async enter(_adapter, _context, controls) { controls.terminate() },
      }))
      .with(middleware("leaver", {
        async leave() { log.push("leave") },
      }))
    await codeOf(builder.get())
    expect(log).toEqual([])
  })
})

describe("builder run - error and missing response", () => {
  it("throws NO_RESPONSE when the adapter returns nothing on a normal run", async () => {
    const adapter: OhNetAdapter = async () => undefined as never
    const builder = createBuilder(adapter)
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.NO_RESPONSE)
  })

  it("prefers the context error over the response and the SKIPPED branch", async () => {
    const builder = createBuilder().with(middleware("failing", {
      async enter(_adapter, context, controls) {
        context.error = new OhNetError("CUSTOM", "OHNET_CUSTOM", "ohnet: custom")
        context.response = createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ignored" })
        controls.skip()
      },
    }))
    expect(await codeOf(builder.get())).toBe("OHNET_CUSTOM")
  })
})

describe("builder run - retry semantics", () => {
  it("returns the response data when middleware retries after a 401", async () => {
    let calls = 0
    const adapter: OhNetAdapter = async (context) => {
      calls++
      if (calls === 1) {
        return createResponse({ status: 401, url: context.request.url, headers: {}, data: null })
      }
      return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
    }
    const builder = new OhNetBuilder({ url: "https://example.com", adapter })
      .with(middleware("auth", {
        async leave(_adapter, context, controls) {
          if (context.response?.status === 401) {
            controls.retry()
          }
        },
      }))
    await expect(builder.get()).resolves.toBe("ok")
    expect(calls).toBe(2)
  })

  it("also returns the response data when retry is called from the enter hook", async () => {
    let calls = 0
    const adapter: OhNetAdapter = async (context) => {
      calls++
      return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
    }
    const builder = new OhNetBuilder({ url: "https://example.com", adapter })
      .with(middleware("precheck", {
        async enter(_adapter, context, controls) {
          if (!context.request.headers.has("x-pre")) {
            context.request.headers.set("x-pre", "yes")
            controls.retry()
          }
        },
      }))
    await expect(builder.get()).resolves.toBe("ok")
    expect(calls).toBe(1)
  })

  it("throws RETRY_EXHAUSTED when retry budget is exceeded (middlewareRetries default = 1)", async () => {
    const builder = createBuilder().with(middleware("always-retry", {
      async leave(_adapter, _context, controls) {
        controls.retry()
      },
    }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.RETRY_EXHAUSTED)
  })

  it("exhausts on the first retry when middlewareRetries is 0", async () => {
    let calls = 0
    const adapter: OhNetAdapter = async (context) => {
      calls++
      return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
    }
    const builder = new OhNetBuilder({ url: "https://example.com", middlewareRetries: 0, adapter })
      .with(middleware("always-retry", {
        async leave(_adapter, _context, controls) {
          controls.retry()
        },
      }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.RETRY_EXHAUSTED)
    expect(calls).toBe(1)
  })

  it("allows the configured number of retries before exhausting (middlewareRetries: 2)", async () => {
    let calls = 0
    const adapter: OhNetAdapter = async (context) => {
      calls++
      return createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" })
    }
    const builder = new OhNetBuilder({ url: "https://example.com", middlewareRetries: 2, adapter })
      .with(middleware("always-retry", {
        async leave(_adapter, _context, controls) {
          controls.retry()
        },
      }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.RETRY_EXHAUSTED)
    expect(calls).toBe(3)
  })

  it("skips the leave chain when retry is called in enter (the discard-attempt semantic)", async () => {
    const leaveSeen: string[] = []
    const builder = createBuilder()
      .with(middleware("discard", {
        async enter(_adapter, _context, controls) {
          controls.retry()
        },
        async leave() {
          leaveSeen.push("discard")
        },
      }))
      .with(middleware("leaver", {
        async leave() {
          leaveSeen.push("leaver")
        },
      }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.RETRY_EXHAUSTED)
    expect(leaveSeen).toEqual([])
  })

  it("skips remaining leave hooks when retry is called in a leave hook", async () => {
    const leaveSeen: string[] = []
    const builder = createBuilder()
      .with(middleware("a", {
        async leave() {
          leaveSeen.push("a")
        },
      }))
      .with(middleware("b", {
        async leave() {
          leaveSeen.push("b")
        },
      }))
      .with(middleware("c", {
        async leave(_adapter, _context, controls) {
          leaveSeen.push("c")
          controls.retry()
        },
      }))
    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.RETRY_EXHAUSTED)
    expect(leaveSeen).toEqual(["c", "c"])
  })

  it("increments controls.retryCount across attempts (0 on initial, 1 on first retry, 2 on second)", async () => {
    const seenRetryCounts: number[] = []
    const builder = new OhNetBuilder({
      url: "https://example.com",
      middlewareRetries: 2,
      adapter: async context =>
        createResponse({ status: 200, url: context.request.url, headers: {}, data: "ok" }),
    }).with(middleware("counter", {
      async enter(_adapter, _context, controls) {
        seenRetryCounts.push(controls.retryCount)
        if (controls.retryCount < 2) {
          controls.retry()
        }
      },
    }))
    await builder.get()
    expect(seenRetryCounts).toEqual([0, 1, 2])
  })
})
