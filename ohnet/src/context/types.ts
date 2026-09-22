import type { OhNetMethod, OhNetParams, OhNetResponseKind, OhNetResponseType } from "../core/types"
import type { BaseOhNetError } from "../model/error"
import type { OhNetHeader, OhNetHeaderLike } from "../model/header"
import type { OhNetSignal } from "../model/signal"

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
