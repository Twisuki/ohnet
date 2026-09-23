import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetEventHandler, OhNetEventName } from "@/pipeline/types"
import type { OhNetContext } from "@/types"

export class OhNetEventBuilder {
  #events: Map<OhNetEventName, OhNetEventHandler[]>

  constructor() {
    this.#events = new Map()
  }

  fork(): OhNetEventBuilder {
    const child = new OhNetEventBuilder()
    for (const [event, list] of this.#events) {
      child.#events.set(event, [...list])
    }
    return child
  }

  list(event?: OhNetEventName): readonly OhNetEventHandler[] {
    if (event === undefined) {
      const all: OhNetEventHandler[] = []
      for (const list of this.#events.values()) all.push(...list)
      return all
    }
    return [...(this.#events.get(event) ?? [])]
  }

  on(event: OhNetEventName, callback: OhNetEventHandler): OhNetEventBuilder {
    const child = this.fork()
    const list = [...(child.#events.get(event) ?? [])]
    list.push(callback)
    child.#events.set(event, list)
    return child
  }

  off(event: OhNetEventName, target: OhNetEventHandler): OhNetEventBuilder {
    const child = this.fork()
    const current = child.#events.get(event)
    if (!current)
      return child
    const next = current.filter(handler => handler !== target)
    if (next.length === 0)
      child.#events.delete(event)
    else child.#events.set(event, next)
    return child
  }

  emit(event: OhNetEventName, adapter: OhNetAdapter, context: OhNetContext): void {
    const list = this.#events.get(event)
    if (!list)
      return
    for (const handler of list) {
      try {
        handler(adapter, context)
      }
      catch {}
    }
  }
}
