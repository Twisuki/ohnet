import type { BaseOhNetError } from "./error"

export type OhNetMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

export type OhNetHeader = Record<string, string>

export interface OhNetSignal {
  aborted: boolean
  onAbort?: () => void
}

export interface OhNetRequest {
  url: string
  method: OhNetMethod
  headers: OhNetHeader
  body?: unknown
  signal?: OhNetSignal
  timeout?: number
}

export interface OhNetResponse {
  status: number
  text: string
  headers: OhNetHeader
  data: unknown
}

export interface OhNetContext {
  request: OhNetRequest
  response: OhNetResponse | null
  error: BaseOhNetError | null
  meta: Record<string | symbol, unknown>
}

export type OhNetAdapter = (context: OhNetContext) => Promise<OhNetResponse>

export type OhNetConfig = Partial<OhNetRequest> & {
  adapter?: OhNetAdapter
}

export type OhNetMiddlewareNext = (context: OhNetContext) => Promise<OhNetContext>

export abstract class BaseOhNetMiddleware {
  async onStart?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onSuccess?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onError?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
}
