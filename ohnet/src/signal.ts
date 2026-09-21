import type { OhNetSignal } from "./types"

export class OhNetController implements OhNetSignal {
  #aborted = false
  #reason: unknown
  #listeners = new Set<() => void>()
  #onAbort: (() => void) | undefined

  get signal(): OhNetSignal {
    return this
  }

  get aborted(): boolean {
    return this.#aborted
  }

  get reason(): unknown {
    return this.#reason
  }

  get onAbort(): (() => void) | undefined {
    return this.#onAbort
  }

  set onAbort(listener: (() => void) | undefined) {
    this.#onAbort = listener
  }

  addEventListener(type: "abort", listener: () => void): void {
    if (type !== "abort")
      return
    this.#listeners.add(listener)
  }

  removeEventListener(type: "abort", listener: () => void): void {
    if (type !== "abort")
      return
    this.#listeners.delete(listener)
  }

  abort(reason?: unknown): void {
    if (this.#aborted)
      return

    this.#aborted = true
    this.#reason = reason

    const listeners = [...this.#listeners]
    this.#listeners.clear()
    for (const listener of listeners)
      listener()

    const onAbort = this.#onAbort
    this.#onAbort = undefined
    onAbort?.()
  }
}

export function subscribeAbort(
  signal: OhNetSignal | null | undefined,
  listener: () => void,
): () => void {
  if (!signal)
    return () => {}

  if (signal.aborted) {
    listener()
    return () => {}
  }

  if (typeof signal.addEventListener === "function") {
    signal.addEventListener("abort", listener)
    return () => signal.removeEventListener?.("abort", listener)
  }

  const previous = signal.onAbort
  const wrapped = (): void => {
    previous?.()
    listener()
  }
  signal.onAbort = wrapped
  return () => {
    if (signal.onAbort === wrapped)
      signal.onAbort = previous
  }
}
