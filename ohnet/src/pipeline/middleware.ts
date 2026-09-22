import type { OhNetAdapter } from "../adapter/types"
import type { OhNetContext } from "../core/types"

export type OhNetMiddlewareNext = (context: OhNetContext) => Promise<OhNetContext>

export abstract class BaseOhNetMiddleware {
  async onStart?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onSuccess?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onError?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
}
