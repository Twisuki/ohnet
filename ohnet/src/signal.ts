import type { OhNetSignal } from "./types"

export class OhNetController {
  signal: OhNetSignal = { aborted: false }

  abort(): void {
    if (this.signal.aborted) {
      return
    }
    this.signal.aborted = true
    this.signal.onAbort?.()
  }
}
