import type { BaseOhNetError } from "../model/error"
import type { OhNetHeader } from "../model/header"
import type { OhNetSignal } from "../model/signal"

export type OhNetMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

export type OhNetResponseType = "auto" | "json" | "text" | "arraybuffer" | "blob" | "stream" | "raw"

export type OhNetResponseKind = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"

export type OhNetParams
  = | string
    | Record<string, unknown>
    | Iterable<readonly [string, string]>

export interface OhNetRequest {
  url: string
  method: OhNetMethod
  headers: OhNetHeader
  params?: OhNetParams
  data?: unknown
  signal?: OhNetSignal
  timeout?: number
  responseType: OhNetResponseType
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

export interface OhNetContext {
  request: OhNetRequest
  response: OhNetResponse | null
  error: BaseOhNetError | null
  meta: Record<string | symbol, unknown>
}
