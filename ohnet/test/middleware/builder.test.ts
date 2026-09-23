import type { OhNetMiddleware } from "@twisuki/ohnet"
import { createResponse, OhNetMiddleware as Middleware, OHNET_ERROR_CODE, OhNetBuilder, OhNetError } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

function createBuilder(): OhNetBuilder {
  return new OhNetBuilder({
    url: "https://example.com",
    adapter: async () => createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" }),
  })
}

function recorder(name: string, tag: string, log: string[]): OhNetMiddleware {
  return {
    name,
    async enter() {
      log.push(`enter:${tag}`)
    },
    async leave() {
      log.push(`leave:${tag}`)
    },
  }
}

describe("builder middleware registration", () => {
  it("replaces the middleware with the same name", async () => {
    const log: string[] = []
    const oldAuth = recorder("auth", "auth-old", log)
    const newAuth = recorder("auth", "auth-new", log)
    const builder = createBuilder()
      .with(oldAuth)
      .with(recorder("logger", "logger", log))
      .with(newAuth)

    expect(builder.middleware.has("auth")).toBe(true)
    expect(builder.middleware.has("logger")).toBe(true)
    expect(builder.middleware.get("auth")).toBe(newAuth)
    expect(builder.middleware.get("auth")).not.toBe(oldAuth)

    await builder.get()
    expect(log).toEqual(["enter:auth-new", "enter:logger", "leave:logger", "leave:auth-new"])
  })

  it("keeps registration order when replacing", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(recorder("a", "a-old", log))
      .with(recorder("b", "b", log))
      .with(recorder("c", "c", log))
      .with(recorder("a", "a-new", log))

    await builder.get()
    expect(log).toEqual(["enter:a-new", "enter:b", "enter:c", "leave:c", "leave:b", "leave:a-new"])
  })

  it("is idempotent when the same middleware is registered twice", async () => {
    const log: string[] = []
    const middleware = recorder("auth", "auth", log)
    const builder = createBuilder().with(middleware).with(middleware)

    expect(builder.middleware.get("auth")).toBe(middleware)

    await builder.get()
    expect(log).toEqual(["enter:auth", "leave:auth"])
  })

  it("throws when the middleware name is empty", () => {
    const log: string[] = []
    expect(() => createBuilder().with(recorder("", "x", log))).toThrow(OhNetError)

    try {
      createBuilder().with(recorder("  ", "x", log))
      expect.unreachable("expected an error to be thrown")
    }
    catch (error) {
      expect(error).toBeInstanceOf(OhNetError)
      expect((error as OhNetError).code).toBe(OHNET_ERROR_CODE.MIDDLEWARE_NAME)
    }
  })
})

describe("builder middleware operations", () => {
  it("has / get query registered middlewares", () => {
    const log: string[] = []
    const auth = recorder("auth", "auth", log)
    const builder = createBuilder().with(auth)

    expect(builder.middleware.has("auth")).toBe(true)
    expect(builder.middleware.has("missing")).toBe(false)
    expect(builder.middleware.get("auth")).toBe(auth)
    expect(builder.middleware.get("missing")).toBeUndefined()
  })

  it("clean removes the middleware by name", async () => {
    const log: string[] = []
    const builder = createBuilder()
      .with(recorder("auth", "auth", log))
      .with(recorder("logger", "logger", log))
      .clean("auth")

    expect(builder.middleware.has("auth")).toBe(false)
    expect(builder.middleware.has("logger")).toBe(true)

    await builder.get()
    expect(log).toEqual(["enter:logger", "leave:logger"])
  })

  it("clean is a no-op when the name is absent", () => {
    const log: string[] = []
    const builder = createBuilder().with(recorder("auth", "auth", log))
    const cleaned = builder.clean("missing")

    expect(cleaned.middleware.has("auth")).toBe(true)
    expect(cleaned.middleware.get("auth")).toBeDefined()
  })

  it("does not mutate the parent builder on fork or clean", () => {
    const log: string[] = []
    const parent = createBuilder().with(recorder("auth", "auth", log))
    const child = parent.with(recorder("logger", "logger", log))
    const cleaned = parent.clean("auth")

    expect(parent.middleware.has("logger")).toBe(false)
    expect(parent.middleware.get("auth")).toBeDefined()
    expect(child.middleware.has("logger")).toBe(true)
    expect(child.middleware.has("auth")).toBe(true)
    expect(cleaned.middleware.has("auth")).toBe(false)
  })
})

describe("ohnet middleware subclass", () => {
  it("supports declaring name via a subclass", async () => {
    const log: string[] = []

    class TagMiddleware extends Middleware {
      readonly name = "tag"

      async enter(): Promise<void> {
        log.push("enter:tag")
      }
    }

    await createBuilder().with(new TagMiddleware()).get()
    expect(log).toEqual(["enter:tag"])
  })
})
