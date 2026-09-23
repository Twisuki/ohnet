import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetContext } from "@/types"

export const OHNET_EVENT = {
  START: "on_start",
  REQUEST: "on_request",
  RESPONSE: "on_response",
  SUCCESS: "on_success",
  SKIP: "on_skip",
  ERROR: "on_error",
  FINISH: "on_finish",
} as const satisfies Record<string, string>

export type OhNetEventName = (typeof OHNET_EVENT)[keyof typeof OHNET_EVENT]

export type OhNetEventHandler = (adapter: OhNetAdapter, context: OhNetContext) => void

export interface OhNetMiddlewareEnterControls {
  skip: () => void
  terminate: () => void
}

export interface OhNetMiddlewareLeaveControls {
  terminate: () => void
}

export abstract class OhNetMiddleware {
  abstract readonly name: string
  enter?(adapter: OhNetAdapter, context: OhNetContext, controls: OhNetMiddlewareEnterControls): Promise<void>
  leave?(adapter: OhNetAdapter, context: OhNetContext, controls: OhNetMiddlewareLeaveControls): Promise<void>
}
