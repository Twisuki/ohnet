import type { OhNetMiddleware } from "@twisuki/ohnet"
import { createResponse } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"
import { createDefaultContext } from "@/context/utils"
import { compose } from "@/middleware/dispatcher"

function createAdapter() {
  const calls: string[] = []
  const adapter = async () => {
    calls.push("adapter")
    return createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" })
  }
  return { adapter, calls }
}

function middleware(
  name: string,
  hooks: Omit<Partial<OhNetMiddleware>, "name">,
): OhNetMiddleware {
  return { name, ...hooks }
}

describe("compose return value", () => {
  it("returns true when the pipeline completes normally", async () => {
    const { adapter, calls } = createAdapter()
    const result = await compose(adapter, createDefaultContext(), [])

    expect(result).toBe(true)
    expect(calls).toEqual(["adapter"])
  })

  it("returns true when middlewares only observe", async () => {
    const { adapter, calls } = createAdapter()
    const result = await compose(adapter, createDefaultContext(), [
      middleware("enter-only", { async enter() { calls.push("enter") } }),
      middleware("leave-only", { async leave() { calls.push("leave") } }),
    ])

    expect(result).toBe(true)
    expect(calls).toEqual(["enter", "adapter", "leave"])
  })

  it("returns false and skips the adapter when enter calls skip", async () => {
    const { adapter, calls } = createAdapter()
    const result = await compose(adapter, createDefaultContext(), [
      middleware("skipper", { async enter(_adapter, _context, controls) { controls.skip() } }),
      middleware("after", { async enter() { calls.push("after") } }),
    ])

    expect(result).toBe(false)
    expect(calls).toEqual([])
  })

  it("returns false and skips the adapter when enter calls terminate", async () => {
    const { adapter, calls } = createAdapter()
    const result = await compose(adapter, createDefaultContext(), [
      middleware("terminator", { async enter(_adapter, _context, controls) { controls.terminate() } }),
      middleware("after", { async enter() { calls.push("after") } }),
    ])

    expect(result).toBe(false)
    expect(calls).toEqual([])
  })

  it("returns false when leave calls terminate", async () => {
    const { adapter, calls } = createAdapter()
    const result = await compose(adapter, createDefaultContext(), [
      middleware("outer", { async leave() { calls.push("outer") } }),
      middleware("terminator", {
        async leave(_adapter, _context, controls) {
          calls.push("terminator")
          controls.terminate()
        },
      }),
    ])

    expect(result).toBe(false)
    expect(calls).toEqual(["adapter", "terminator"])
  })
})
