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

describe("event handler registration", () => {
  it("emit triggers the registered handler", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const eb = builder.event.on(OHNET_EVENT.START, () => calls.push("start"))
    eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)
    expect(calls).toEqual(["start"])
  })

  it("emits to multiple handlers in registration order", () => {
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

  it("off on an event with no registrations is a no-op", () => {
    const builder = createBuilder()
    expect(() => builder.event.off(OHNET_EVENT.SUCCESS, () => {})).not.toThrow()
  })

  it("on / off are immutable — parent is not mutated", () => {
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

describe("event emit semantics", () => {
  it("emit silently swallows handler errors", () => {
    const builder = createBuilder()
    const calls: string[] = []
    const eb = builder.event
      .on(OHNET_EVENT.START, () => { throw new Error("boom") })
      .on(OHNET_EVENT.START, () => calls.push("ok"))
    expect(() => eb.emit(OHNET_EVENT.START, fakeAdapter, fakeContext)).not.toThrow()
    expect(calls).toEqual(["ok"])
  })

  it("emit on an unregistered event is a no-op", () => {
    const builder = createBuilder()
    expect(() => builder.event.emit(OHNET_EVENT.SUCCESS, fakeAdapter, fakeContext)).not.toThrow()
  })

  it("list returns the registered handlers for an event", () => {
    const builder = createBuilder()
    const h1 = () => {}
    const h2 = () => {}
    const eb = builder.event.on(OHNET_EVENT.START, h1).on(OHNET_EVENT.START, h2)
    const list = eb.list(OHNET_EVENT.START)
    expect(list).toHaveLength(2)
    expect(list).toContain(h1)
    expect(list).toContain(h2)
  })

  it("list without event returns handlers across all events", () => {
    const builder = createBuilder()
    const eb = builder.event
      .on(OHNET_EVENT.START, () => {})
      .on(OHNET_EVENT.SUCCESS, () => {})
      .on(OHNET_EVENT.SUCCESS, () => {})
    expect(eb.list()).toHaveLength(3)
  })
})
