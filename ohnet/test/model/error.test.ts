import { OhNetError } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("error - construction", () => {
  it("extends both Error and OhNetError", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(OhNetError)
  })

  it("holds the raw message without a [code] prefix", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.message).toBe("internal error")
  })

  it("accepts data and error as optional fields", () => {
    const cause = new Error("cause")
    const withAll = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error", { foo: 1 }, cause)
    expect(withAll.type).toBe("INTERNAL")
    expect(withAll.code).toBe("OHNET_INTERNAL")
    expect(withAll.message).toBe("internal error")
    expect(withAll.data).toEqual({ foo: 1 })
    expect(withAll.error).toBe(cause)

    const withNone = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(withNone.data).toBeUndefined()
    expect(withNone.error).toBeUndefined()
  })

  it("accepts a non-Error cause (e.g., a string)", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error", undefined, "raw cause")
    expect(e.error).toBe("raw cause")
  })

  it("accepts structured data (object payload)", () => {
    const data = { status: 401, url: "/api" }
    const e = new OhNetError("AUTH", "OHNET_AUTH", "unauthorized", data)
    expect(e.data).toEqual(data)
  })
})

describe("error - runtime", () => {
  it("can be thrown and caught as an OhNetError", () => {
    try {
      throw new OhNetError("T", "C", "m")
    }
    catch (err) {
      expect(err).toBeInstanceOf(OhNetError)
      expect(err).toBeInstanceOf(Error)
      if (err instanceof OhNetError) {
        expect(err.type).toBe("T")
        expect(err.code).toBe("C")
        expect(err.message).toBe("m")
      }
    }
  })

  it("inherits name from Error", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.name).toBe("Error")
  })

  it("toString returns 'Error: <message>'", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.toString()).toBe("Error: internal error")
  })

  it("stack contains the raw message", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(typeof e.stack).toBe("string")
    expect(e.stack).toContain("internal error")
  })
})
