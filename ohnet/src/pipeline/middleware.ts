import type { OhNetAdapter, OhNetContext } from "../context/types"

export type OhNetMiddlewareNext = (context: OhNetContext) => Promise<OhNetContext>

export abstract class BaseOhNetMiddleware {
  async onStart?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onSuccess?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onError?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
}
