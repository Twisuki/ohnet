import { OhNetHeader } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("model OhNetHeader", () => {
  describe("constructor", () => {
    it("no args gives empty", () => {
      const h = new OhNetHeader()
      expect(h.has("content-type")).toBe(false)
      expect(h.toRecord()).toEqual({})
    })

    it("null/undefined gives empty", () => {
      expect(new OhNetHeader(null).toRecord()).toEqual({})
      expect(new OhNetHeader(undefined).toRecord()).toEqual({})
    })

    it("from OhNetHeader makes deep clone", () => {
      const a = new OhNetHeader({ "x-a": "1" })
      const b = new OhNetHeader(a)
      b.append("x-a", "2")
      expect(a.get("x-a")).toBe("1")
      expect(b.get("x-a")).toBe("1, 2")
    })

    it("from plain object, names normalized to lowercase", () => {
      const h = new OhNetHeader({ "Content-Type": "application/json", "X-Foo": "bar" })
      expect(h.get("content-type")).toBe("application/json")
      expect(h.get("x-foo")).toBe("bar")
      expect(h.get("CONTENT-TYPE")).toBe("application/json")
    })

    it("from Iterable<[string, string]>", () => {
      const h = new OhNetHeader([["a", "1"], ["b", "2"]] as Iterable<readonly [string, string]>)
      expect(h.get("a")).toBe("1")
      expect(h.get("b")).toBe("2")
    })

    it("from Headers-like (forEach)", () => {
      const fake = {
        forEach: (cb: (value: string, key: string) => void) => {
          cb("v1", "x-a")
          cb("v2", "x-b")
        },
      }
      const h = new OhNetHeader(fake)
      expect(h.get("x-a")).toBe("v1")
      expect(h.get("x-b")).toBe("v2")
    })

    it("from the native Headers instance", () => {
      const native = new Headers()
      native.append("X-Foo", "bar")
      native.append("Content-Type", "application/json")
      const h = new OhNetHeader(native)
      expect(h.get("x-foo")).toBe("bar")
      expect(h.get("content-type")).toBe("application/json")
    })

    it("from() static factory", () => {
      const h = OhNetHeader.from({ x: "1" })
      expect(h).toBeInstanceOf(OhNetHeader)
      expect(h.get("x")).toBe("1")
    })
  })

  describe("operations", () => {
    it("set replaces existing value", () => {
      const h = new OhNetHeader()
      h.set("x-a", "1")
      h.set("x-a", "2")
      expect(h.get("x-a")).toBe("2")
    })

    it("append adds to multi-value (joined with ', ')", () => {
      const h = new OhNetHeader()
      h.append("x-a", "1")
      h.append("x-a", "2")
      expect(h.get("x-a")).toBe("1, 2")
    })

    it("get returns null for missing key", () => {
      const h = new OhNetHeader()
      expect(h.get("missing")).toBe(null)
    })

    it("has returns boolean", () => {
      const h = new OhNetHeader({ x: "1" })
      expect(h.has("x")).toBe(true)
      expect(h.has("missing")).toBe(false)
    })

    it("delete returns boolean and removes", () => {
      const h = new OhNetHeader({ x: "1" })
      expect(h.delete("x")).toBe(true)
      expect(h.delete("x")).toBe(false)
      expect(h.has("x")).toBe(false)
    })

    it("getSetCookie returns array of all values", () => {
      const h = new OhNetHeader()
      h.append("set-cookie", "a=1")
      h.append("set-cookie", "b=2")
      expect(h.getSetCookie()).toEqual(["a=1", "b=2"])
    })

    it("normalizes name to lowercase + trim", () => {
      const h = new OhNetHeader()
      h.set("  X-Foo  ", "1")
      expect(h.has("x-foo")).toBe(true)
      expect(h.has("X-FOO")).toBe(true)
    })

    it("normalizes value to trim", () => {
      const h = new OhNetHeader()
      h.set("x-a", "  bar  ")
      expect(h.get("x-a")).toBe("bar")
    })

    it("rejects invalid header name (with space)", () => {
      const h = new OhNetHeader()
      expect(() => h.set("bad name", "v")).toThrow(TypeError)
    })

    it("rejects invalid header name (with colon)", () => {
      const h = new OhNetHeader()
      expect(() => h.set("bad:name", "v")).toThrow(TypeError)
    })

    it("rejects invalid header value (CR/LF/NUL)", () => {
      const h = new OhNetHeader()
      expect(() => h.set("x-a", "bad\rvalue")).toThrow(TypeError)
      expect(() => h.set("x-a", "bad\nvalue")).toThrow(TypeError)
      expect(() => h.set("x-a", "bad\0value")).toThrow(TypeError)
    })

    it("set and append return this for chaining", () => {
      const h = new OhNetHeader()
      expect(h.set("x", "1")).toBe(h)
      expect(h.append("x", "2")).toBe(h)
    })

    it("delete returns true on hit and false on miss", () => {
      const h = new OhNetHeader()
      expect(h.delete("x")).toBe(false)
      h.set("x", "1")
      expect(h.delete("x")).toBe(true)
    })
  })

  describe("iteration", () => {
    it("forEach iterates all values (multi-value each call)", () => {
      const h = new OhNetHeader()
      h.append("x-a", "1")
      h.append("x-a", "2")
      h.append("x-b", "3")
      const collected: Array<[string, string]> = []
      h.forEach((v, k) => collected.push([k, v]))
      expect(collected.sort()).toEqual([["x-a", "1"], ["x-a", "2"], ["x-b", "3"]].sort())
    })

    it("forEach binds thisArg", () => {
      const h = new OhNetHeader({ x: "1" })
      const ctx = { count: 0 }
      h.forEach(function (this: { count: number }) {
        this.count++
      }, ctx)
      expect(ctx.count).toBe(1)
    })

    it("keys/values/entries iterators", () => {
      const h = new OhNetHeader()
      h.append("x-a", "1")
      h.append("x-a", "2")
      h.append("x-b", "3")
      expect([...h.keys()].sort()).toEqual(["x-a", "x-a", "x-b"].sort())
      expect([...h.values()].sort()).toEqual(["1", "2", "3"].sort())
      expect([...h.entries()].sort()).toEqual([["x-a", "1"], ["x-a", "2"], ["x-b", "3"]].sort())
    })

    it("[Symbol.iterator] iterates entries", () => {
      const h = new OhNetHeader()
      h.set("x-a", "1")
      h.set("x-b", "2")
      expect([...h].sort()).toEqual([["x-a", "1"], ["x-b", "2"]].sort())
    })
  })

  describe("clone and concat", () => {
    it("clone is independent", () => {
      const a = new OhNetHeader({ x: "1" })
      const b = a.clone()
      b.set("x", "2")
      expect(a.get("x")).toBe("1")
      expect(b.get("x")).toBe("2")
    })

    it("concat replaces each key with the right-side value(s)", () => {
      const a = new OhNetHeader({ x: "1", y: "1" })
      const b = new OhNetHeader({ x: "2", z: "2" })
      const c = a.concat(b)
      expect(c.get("x")).toBe("2")
      expect(c.get("y")).toBe("1")
      expect(c.get("z")).toBe("2")
    })

    it("concat does not mutate original", () => {
      const a = new OhNetHeader({ x: "1" })
      const b = new OhNetHeader({ x: "2" })
      a.concat(b)
      expect(a.get("x")).toBe("1")
    })
  })

  describe("serialization", () => {
    it("toRecord outputs Record<string, string> (multi-value joined)", () => {
      const h = new OhNetHeader()
      h.append("x-a", "1")
      h.append("x-a", "2")
      h.set("x-b", "3")
      expect(h.toRecord()).toEqual({ "x-a": "1, 2", "x-b": "3" })
    })

    it("toJSON same as toRecord", () => {
      const h = new OhNetHeader({ x: "1" })
      expect(h.toJSON()).toEqual(h.toRecord())
    })

    it("toJSON is invoked by JSON.stringify automatically", () => {
      const h = new OhNetHeader({ x: "1", y: "2" })
      expect(JSON.stringify(h)).toBe("{\"x\":\"1\",\"y\":\"2\"}")
    })
  })

  describe("native Headers compatibility", () => {
    it("ohNetHeader to native Headers via toRecord", () => {
      const ours = new OhNetHeader({ "x-a": "1", "x-b": "2" })
      const native = new Headers(ours.toRecord())
      expect(native.get("x-a")).toBe("1")
      expect(native.get("x-b")).toBe("2")
    })

    it("native Headers to OhNetHeader", () => {
      const native = new Headers({ "X-Foo": "bar" })
      const ours = new OhNetHeader(native)
      expect(ours.get("x-foo")).toBe("bar")
    })

    it("forEach signature compatible with native Headers", () => {
      const ours = new OhNetHeader({ "x-a": "1", "x-b": "2" })
      const native = new Headers()
      ours.forEach((v, k) => native.append(k, v))
      expect(native.get("x-a")).toBe("1")
      expect(native.get("x-b")).toBe("2")
    })

    it("round-trip native Headers and OhNetHeader preserves values", () => {
      const original = new Headers()
      original.append("set-cookie", "a=1")
      original.append("set-cookie", "b=2")
      original.set("x-foo", "bar")

      const ours = new OhNetHeader(original)
      const roundtrip = new Headers(ours.toRecord())

      expect(roundtrip.get("x-foo")).toBe("bar")
      expect(roundtrip.get("set-cookie")).toBe("a=1, b=2")
    })
  })
})
