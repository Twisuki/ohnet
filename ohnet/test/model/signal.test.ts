import { OhNetController, subscribeAbort } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("controller - state", () => {
  it("starts not aborted with no reason", () => {
    const c = new OhNetController()
    expect(c.aborted).toBe(false)
    expect(c.reason).toBeUndefined()
  })

  it("abort sets the aborted flag and stores the reason", () => {
    const c = new OhNetController()
    const reason = new Error("stop")
    c.abort(reason)
    expect(c.aborted).toBe(true)
    expect(c.reason).toBe(reason)
  })

  it("subsequent abort calls are no-ops and listeners do not re-fire", () => {
    const c = new OhNetController()
    let count = 0
    c.addEventListener("abort", () => count++)
    c.abort("first")
    c.abort("second")
    expect(count).toBe(1)
    expect(c.reason).toBe("first")
  })

  it("signal getter returns itself", () => {
    const c = new OhNetController()
    expect(c.signal).toBe(c)
  })

  it("aborted flag survives JSON.stringify (reason is excluded)", () => {
    const c = new OhNetController()
    c.abort(new Error("internal"))
    const snap = JSON.parse(JSON.stringify({ aborted: c.aborted }))
    expect(snap.aborted).toBe(true)
  })
})

describe("controller - addEventListener", () => {
  it("fires abort listeners when abort is called", () => {
    const c = new OhNetController()
    let fired = false
    c.addEventListener("abort", () => {
      fired = true
    })
    c.abort()
    expect(fired).toBe(true)
  })

  it("ignores non-abort event types", () => {
    const c = new OhNetController()
    let fired = false
    c.addEventListener("other" as any, () => {
      fired = true
    })
    c.abort()
    expect(fired).toBe(false)
  })

  it("removeEventListener detaches a listener", () => {
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

  it("fires every registered listener", () => {
    const c = new OhNetController()
    let count = 0
    c.addEventListener("abort", () => count++)
    c.addEventListener("abort", () => count++)
    c.addEventListener("abort", () => count++)
    c.abort()
    expect(count).toBe(3)
  })

  it("clears listeners after abort (one-shot)", () => {
    const c = new OhNetController()
    let count = 0
    c.addEventListener("abort", () => count++)
    c.abort()
    c.addEventListener("abort", () => count++)
    c.abort()
    expect(count).toBe(1)
  })
})

describe("controller - onAbort", () => {
  it("fires on abort and clears itself", () => {
    const c = new OhNetController()
    let fired = false
    c.onAbort = () => {
      fired = true
    }
    c.abort()
    expect(fired).toBe(true)
    expect(c.onAbort).toBeUndefined()
  })

  it("setting undefined cancels a previous handler", () => {
    const c = new OhNetController()
    let count = 0
    c.onAbort = () => count++
    c.onAbort = undefined
    c.abort()
    expect(count).toBe(0)
  })
})

describe("subscribeAbort - null and undefined signals", () => {
  it("returns a no-op cleanup for null", () => {
    let called = false
    const cleanup = subscribeAbort(null, () => {
      called = true
    })
    expect(typeof cleanup).toBe("function")
    expect(called).toBe(false)
    cleanup()
    expect(called).toBe(false)
  })

  it("returns a no-op cleanup for undefined", () => {
    let called = false
    const cleanup = subscribeAbort(undefined, () => {
      called = true
    })
    expect(called).toBe(false)
    cleanup()
    expect(called).toBe(false)
  })
})

describe("subscribeAbort - addEventListener path", () => {
  it("fires the wrapped callback immediately when the signal is already aborted", () => {
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

  it("fires the wrapped callback on a subsequent abort", () => {
    const c = new OhNetController()
    let called = false
    const cleanup = subscribeAbort(c, () => {
      called = true
    })
    c.abort()
    expect(called).toBe(true)
    cleanup()
  })

  it("cleanup unsubscribes from addEventListener", () => {
    const c = new OhNetController()
    let called = false
    const cleanup = subscribeAbort(c, () => {
      called = true
    })
    cleanup()
    c.abort()
    expect(called).toBe(false)
  })

  it("cleanup is idempotent (multiple calls do not throw)", () => {
    const c = new OhNetController()
    const cleanup = subscribeAbort(c, () => {})
    cleanup()
    cleanup()
  })

  it("works with the native AbortSignal (fires on abort)", () => {
    const controller = new AbortController()
    let called = false
    const cleanup = subscribeAbort(controller.signal, () => {
      called = true
    })
    controller.abort("native")
    expect(called).toBe(true)
    cleanup()
  })

  it("works with an already-aborted native AbortSignal", () => {
    const controller = new AbortController()
    controller.abort("preset")
    let called = false
    subscribeAbort(controller.signal, () => {
      called = true
    })
    expect(called).toBe(true)
  })
})

describe("subscribeAbort - onAbort path", () => {
  it("fires the wrapped callback when the signal aborts", () => {
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

  it("cleanup restores the previous onAbort", () => {
    const sig = { aborted: false } as any
    const cleanup = subscribeAbort(sig, () => {})
    expect(typeof sig.onAbort).toBe("function")
    cleanup()
    expect(sig.onAbort).toBeUndefined()
  })

  it("chains with a pre-existing onAbort handler", () => {
    const sig = { aborted: false } as any
    const calls: string[] = []
    sig.onAbort = () => calls.push("previous")
    const cleanup = subscribeAbort(sig, () => calls.push("wrapped"))
    sig.onAbort()
    expect(calls).toEqual(["previous", "wrapped"])
    cleanup()
  })
})
