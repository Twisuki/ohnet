import { OhNetController, subscribeAbort } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("model OhNetController + subscribeAbort", () => {
  describe("model OhNetController", () => {
    it("initial state: not aborted, no reason", () => {
      const c = new OhNetController()
      expect(c.aborted).toBe(false)
      expect(c.reason).toBeUndefined()
    })

    it("abort() sets aborted=true and reason", () => {
      const c = new OhNetController()
      const reason = new Error("stop")
      c.abort(reason)
      expect(c.aborted).toBe(true)
      expect(c.reason).toBe(reason)
    })

    it("abort() is idempotent (second call no-op, listeners don't re-fire)", () => {
      const c = new OhNetController()
      let count = 0
      c.addEventListener("abort", () => count++)
      c.abort("first")
      c.abort("second")
      expect(count).toBe(1)
      expect(c.reason).toBe("first")
    })

    it("addEventListener fires on abort", () => {
      const c = new OhNetController()
      let fired = false
      c.addEventListener("abort", () => {
        fired = true
      })
      c.abort()
      expect(fired).toBe(true)
    })

    it("addEventListener ignores non-abort types", () => {
      const c = new OhNetController()
      let fired = false
      c.addEventListener("other" as any, () => {
        fired = true
      })
      c.abort()
      expect(fired).toBe(false)
    })

    it("removeEventListener removes listener", () => {
      const c = new OhNetController()
      let fired = false
      const listener = () => {
        fired = true
      }
      c.addEventListener("abort", listener)
      c.removeEventListener("abort", listener)
      c.abort()
      expect(fired).toBe(false)
    })

    it("multiple listeners all fire on abort", () => {
      const c = new OhNetController()
      let count = 0
      c.addEventListener("abort", () => count++)
      c.addEventListener("abort", () => count++)
      c.addEventListener("abort", () => count++)
      c.abort()
      expect(count).toBe(3)
    })

    it("listeners cleared after abort (one-shot)", () => {
      const c = new OhNetController()
      let count = 0
      c.addEventListener("abort", () => count++)
      c.abort()
      c.addEventListener("abort", () => count++)
      c.abort()
      expect(count).toBe(1)
    })

    it("onAbort getter/setter fires on abort", () => {
      const c = new OhNetController()
      let fired = false
      c.onAbort = () => {
        fired = true
      }
      c.abort()
      expect(fired).toBe(true)
      expect(c.onAbort).toBeUndefined()
    })

    it("onAbort setting undefined cancels previous", () => {
      const c = new OhNetController()
      let count = 0
      c.onAbort = () => count++
      c.onAbort = undefined
      c.abort()
      expect(count).toBe(0)
    })

    it("signal getter returns self (OhNetSignal interface)", () => {
      const c = new OhNetController()
      expect(c.signal).toBe(c)
    })
  })

  describe("subscribeAbort", () => {
    it("null signal: no listener call, cleanup no-op", () => {
      let called = false
      const wrapped = () => {
        called = true
      }
      const cleanup = subscribeAbort(null, wrapped)
      expect(typeof cleanup).toBe("function")
      expect(called).toBe(false)
      cleanup()
      expect(called).toBe(false)
    })

    it("undefined signal: no listener call, cleanup no-op", () => {
      let called = false
      const cleanup = subscribeAbort(undefined, () => {
        called = true
      })
      expect(called).toBe(false)
      cleanup()
      expect(called).toBe(false)
    })

    it("already-aborted signal: listener called immediately", () => {
      const c = new OhNetController()
      c.abort("preset")
      let called = false
      const cleanup = subscribeAbort(c, () => {
        called = true
      })
      expect(called).toBe(true)
      expect(typeof cleanup).toBe("function")
      cleanup()
    })

    it("active signal via addEventListener path: fires on abort", () => {
      const c = new OhNetController()
      let called = false
      const cleanup = subscribeAbort(c, () => {
        called = true
      })
      c.abort()
      expect(called).toBe(true)
      cleanup()
    })

    it("cleanup unsubscribes (addEventListener path)", () => {
      const c = new OhNetController()
      let called = false
      const cleanup = subscribeAbort(c, () => {
        called = true
      })
      cleanup()
      c.abort()
      expect(called).toBe(false)
    })

    it("active signal via onAbort path: fires on abort", () => {
      const sig = { aborted: false } as any
      let called = false
      const cleanup = subscribeAbort(sig, () => {
        called = true
      })
      expect(typeof sig.onAbort).toBe("function")
      sig.onAbort()
      expect(called).toBe(true)
      cleanup()
    })

    it("cleanup unsubscribes (onAbort path)", () => {
      const sig = { aborted: false } as any
      const cleanup = subscribeAbort(sig, () => {})
      expect(typeof sig.onAbort).toBe("function")
      cleanup()
      expect(sig.onAbort).toBeUndefined()
    })

    it("cleanup idempotent (multiple calls don't throw)", () => {
      const c = new OhNetController()
      const cleanup = subscribeAbort(c, () => {})
      cleanup()
      cleanup()
    })

    it("native AbortSignal compatibility (uses addEventListener path)", () => {
      const controller = new AbortController()
      let called = false
      const cleanup = subscribeAbort(controller.signal, () => {
        called = true
      })
      controller.abort("native")
      expect(called).toBe(true)
      cleanup()
    })

    it("native AbortSignal already-aborted path", () => {
      const controller = new AbortController()
      controller.abort("preset")
      let called = false
      subscribeAbort(controller.signal, () => {
        called = true
      })
      expect(called).toBe(true)
    })

    it("onAbort path: composes with previous listener", () => {
      const sig = { aborted: false } as any
      const calls: string[] = []
      sig.onAbort = () => calls.push("previous")
      const cleanup = subscribeAbort(sig, () => calls.push("wrapped"))
      sig.onAbort()
      expect(calls).toEqual(["previous", "wrapped"])
      cleanup()
    })
  })

  describe("serialization", () => {
    it("aborted flag is JSON-serializable", () => {
      const c = new OhNetController()
      expect(JSON.stringify({ aborted: c.aborted })).toBe("{\"aborted\":false}")
      c.abort()
      expect(JSON.stringify({ aborted: c.aborted })).toBe("{\"aborted\":true}")
    })

    it("state snapshot roundtrips through JSON.stringify (excluding reason)", () => {
      const c = new OhNetController()
      c.abort()
      const snap = JSON.stringify({ aborted: c.aborted })
      const restored = JSON.parse(snap)
      expect(restored.aborted).toBe(true)
    })
  })
})
