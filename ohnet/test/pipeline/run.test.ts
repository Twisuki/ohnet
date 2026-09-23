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
