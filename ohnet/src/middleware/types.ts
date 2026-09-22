import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetContext } from "@/types"

export interface OhNetMiddlewareEnterControls {
  skip: () => void
  terminate: () => void
}

export interface OhNetMiddlewareLeaveControls {
  terminate: () => void
}

export type OhNetMiddlewareEnterHook = (
  adapter: OhNetAdapter,
  context: OhNetContext,
  controls: OhNetMiddlewareEnterControls,
) => Promise<void>

export type OhNetMiddlewareLeaveHook = (
  adapter: OhNetAdapter,
  context: OhNetContext,
  controls: OhNetMiddlewareLeaveControls,
) => Promise<void>

export abstract class OhNetMiddleware {
  abstract readonly name: string
  enter?: OhNetMiddlewareEnterHook
  leave?: OhNetMiddlewareLeaveHook
}
