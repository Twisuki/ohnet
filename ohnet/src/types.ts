import type { BaseOhNetError } from "./error"
import type { OhNetHeader, OhNetHeaderLike } from "./header"

export type OhNetMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

export type OhNetResponseType = "auto" | "json" | "text" | "arraybuffer" | "blob" | "stream" | "raw"

export type OhNetResponseKind = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"

export interface OhNetSignal {
  readonly aborted: boolean
  reason?: unknown
  addEventListener?: (type: "abort", listener: () => void) => void
  removeEventListener?: (type: "abort", listener: () => void) => void
  onAbort?: () => void
}

export type OhNetParams
  = | string
    | Record<string, unknown>
    | Iterable<readonly [string, string]>

export interface OhNetRequest {
  url: string
  method: OhNetMethod
  headers: OhNetHeader
  params?: OhNetParams
  body?: unknown
  signal?: OhNetSignal
  timeout?: number
  responseType: OhNetResponseType
  transformRequest?: OhNetTransformRequest[]
}

export interface OhNetResponse<T = unknown> {
  status: number
  statusText: string
  ok: boolean
  headers: OhNetHeader
  url: string
  redirected: boolean
  type: OhNetResponseKind
  data: T
  body?: unknown
}

export interface OhNetResponseInit<T = unknown> {
  status?: number
  statusText?: string
  ok?: boolean
  headers?: OhNetHeaderLike
  url?: string
  redirected?: boolean
  type?: OhNetResponseKind
  data?: T
  body?: unknown
}

export interface OhNetContext {
  request: OhNetRequest
  response: OhNetResponse | null
  error: BaseOhNetError | null
  meta: Record<string | symbol, unknown>
}

export type OhNetAdapter = (context: OhNetContext) => Promise<OhNetResponse>

export type OhNetTransformRequest = (
  data: unknown,
  headers: OhNetHeader,
  config: OhNetRequestConfig,
) => unknown

export interface OhNetRequestConfig {
  url?: string
  method?: OhNetMethod
  headers?: OhNetHeaderLike
  params?: OhNetParams
  data?: unknown
  signal?: OhNetSignal
  timeout?: number
  responseType?: OhNetResponseType
  transformRequest?: OhNetTransformRequest[]
}

export interface OhNetConfig extends OhNetRequestConfig {
  adapter?: OhNetAdapter
}

export type OhNetMiddlewareNext = (context: OhNetContext) => Promise<OhNetContext>

export abstract class BaseOhNetMiddleware {
  async onStart?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onSuccess?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
  async onError?(adapter: OhNetAdapter, context: OhNetContext, next: OhNetMiddlewareNext): Promise<OhNetContext>
}
