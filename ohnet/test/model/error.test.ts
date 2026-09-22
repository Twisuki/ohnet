import { OhNetError } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("model OhNetError", () => {
  it("is instance of Error and OhNetError", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(OhNetError)
  })

  it("super() formats Error.message as [code] message", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.message).toBe("internal error")
  })

  it("has all 5 fields populated", () => {
    const cause = new Error("cause")
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error", { foo: 1 }, cause)
    expect(e.type).toBe("INTERNAL")
    expect(e.code).toBe("OHNET_INTERNAL")
    expect(e.message).toBe("internal error")
    expect(e.data).toEqual({ foo: 1 })
    expect(e.error).toBe(cause)
  })

  it("data and error are optional (undefined when omitted)", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.data).toBeUndefined()
    expect(e.error).toBeUndefined()
  })

  it("can be thrown and caught", () => {
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

  it("stack trace contains the formatted message", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(typeof e.stack).toBe("string")
    expect(e.stack).toContain("internal error")
  })

  it("name defaults to Error (not overridden)", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.name).toBe("Error")
  })

  it("toString format (raw message)", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error")
    expect(e.toString()).toBe("Error: internal error")
  })

  it("can hold non-Error cause (e.g., string)", () => {
    const e = new OhNetError("INTERNAL", "OHNET_INTERNAL", "internal error", undefined, "raw cause")
    expect(e.error).toBe("raw cause")
  })

  it("can hold object data (structured info)", () => {
    const data = { status: 401, url: "/api" }
    const e = new OhNetError("AUTH", "OHNET_AUTH", "unauthorized", data)
    expect(e.data).toEqual(data)
  })
})
