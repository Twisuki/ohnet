import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetContext } from "@/types"

export interface OhNetMiddlewareEnterControls {
  skip: () => void
  terminate: () => void
}

export interface OhNetMiddlewareLeaveControls {
  terminate: () => void
}

export type OhNetMiddlewareControls = OhNetMiddlewareEnterControls | OhNetMiddlewareLeaveControls

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

export type OhNetMiddlewareHook = OhNetMiddlewareEnterHook | OhNetMiddlewareLeaveHook

export abstract class OhNetMiddleware {
  enter?: OhNetMiddlewareEnterHook
  leave?: OhNetMiddlewareLeaveHook
}
