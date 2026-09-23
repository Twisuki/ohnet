import type { OhNetAdapter, OhNetContext } from "@twisuki/ohnet"
import { createResponse, OHNET_EVENT, OhNetBuilder } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

const fakeAdapter = {} as OhNetAdapter
const fakeContext = {} as OhNetContext

function createBuilder(): OhNetBuilder {
  return new OhNetBuilder({
    url: "https://example.com",
    adapter: async () => createResponse({ status: 200, url: "https://example.com", headers: {}, data: "ok" }),
  })
}

describe("builder - event registration", () => {
  it("fires the registered handler when emit is called", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const eb = builder.event.on(OHNET_EVENT.START, () => calls.push("start"))
    eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(calls).toEqual(["start"])
  })

  it("runs multiple handlers in registration order", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const eb = builder.event
      .on(OHNET_EVENT.START, () => calls.push("a"))
      .on(OHNET_EVENT.START, () => calls.push("b"))
      .on(OHNET_EVENT.START, () => calls.push("c"))
    eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(calls).toEqual(["a", "b", "c"])
  })

  it("off removes the handler by callback reference", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const handler = () => calls.push("hit")
    const eb = builder.event.on(OHNET_EVENT.START, handler).off(OHNET_EVENT.START, handler)
    eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(calls).toEqual([])
  })

  it("off removes every registration of the same callback", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const handler = () => calls.push("hit")
    const eb = builder.event
      .on(OHNET_EVENT.START, handler)
      .on(OHNET_EVENT.START, handler)
      .off(OHNET_EVENT.START, handler)
    eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(calls).toEqual([])
  })

  it("off is a no-op when no handlers are registered", () => {
    const builder = createBuilder()
    expect(() => builder.event.off(OHNET_EVENT.SUCCESS, () => {})).not.toThrow()
  })

  it("on returns a new event builder without mutating the parent", () => {
    const parent = createBuilder()
    const parentCalls: string[] = []
    const childCalls: string[] = []

    const parentEB = parent.event.on(OHNET_EVENT.START, () => parentCalls.push("parent"))
    const childEB = parentEB.on(OHNET_EVENT.START, () => childCalls.push("child"))

    parentEB.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(parentCalls).toEqual(["parent"])
    expect(childCalls).toEqual([])

    childEB.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(parentCalls).toEqual(["parent", "parent"])
    expect(childCalls).toEqual(["child"])
  })
})

describe("builder - event emit and list", () => {
  it("swallows handler errors without breaking emit", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const eb = builder.event
      .on(OHNET_EVENT.START, () => { throw new Error("boom") })
      .on(OHNET_EVENT.START, () => calls.push("ok"))
    expect(() => eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)).not.toThrow()
    expect(calls).toEqual(["ok"])
  })

  it("emit is a no-op when no handler is registered", () => {
    const builder = createBuilder()
    expect(() => builder.event.emit(OHNET_EVENT.SUCCESS, fakeAdapter, fakeContext)).not.toThrow()
  })

  it("list(event) returns the handlers for that event", () => {
    const builder = createBuilder()
    const h1 = () => {}
    const h2 = () => {}
    const eb = builder.event.on(OHNET_EVENT.START, h1).on(OHNET_EVENT.START, h2)
    const list = eb.list(OHNET_EVENT.START)
    expect(list).toHaveLength(2)
    expect(list).toContain(h1)
    expect(list).toContain(h2)
  })

  it("list() returns handlers across all events", () => {
    const builder = createBuilder()
    const eb = builder.event
      .on(OHNET_EVENT.START, () => {})
      .on(OHNET_EVENT.SUCCESS, () => {})
      .on(OHNET_EVENT.SUCCESS, () => {})
    expect(eb.list()).toHaveLength(3)
  })
})
