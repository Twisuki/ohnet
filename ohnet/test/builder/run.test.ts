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

describe("builder run outcome", () => {
  it("returns response data on a normal run", async () => {
    await expect(createBuilder().get()).resolves.toBe("ok")
  })

  it("throws SKIPPED when a middleware skips without a response", async () => {
    const builder = createBuilder().with(middleware("skipper", {
      async enter(_adapter, _context, controls) { controls.skip() },
    }))

    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.SKIPPED)
  })

  it("returns data when a middleware skips but provides a response", async () => {
    const builder = createBuilder().with(middleware("skipper", {
      async enter(_adapter, context, controls) {
        context.response = createResponse({ status: 200, url: "https://example.com", headers: {}, data: "cached" })
        controls.skip()
      },
    }))

    await expect(builder.get()).resolves.toBe("cached")
  })

  it("throws SKIPPED when a middleware terminates without a response", async () => {
    const builder = createBuilder().with(middleware("terminator", {
      async enter(_adapter, _context, controls) { controls.terminate() },
    }))

    expect(await codeOf(builder.get())).toBe(OHNET_ERROR_CODE.SKIPPED)
  })

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
