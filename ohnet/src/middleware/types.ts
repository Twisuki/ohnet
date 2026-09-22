import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetContext } from "@/types"

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
