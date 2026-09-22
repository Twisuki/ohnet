import type { OhNetAdapter } from "../adapter/types"
import type { OhNetHeaderLike } from "../model/header"
import type { OhNetSignal } from "../model/signal"
import type { OhNetMethod, OhNetParams, OhNetResponseKind, OhNetResponseType } from "../types"

export interface OhNetRequestConfig {
  url?: string
  method?: OhNetMethod
  headers?: OhNetHeaderLike
  params?: OhNetParams
  data?: unknown
  signal?: OhNetSignal
  timeout?: number
  responseType?: OhNetResponseType
}

export interface OhNetResponseLike<T = unknown> {
  status: number
  headers: OhNetHeaderLike
  url: string
  statusText?: string
  ok?: boolean
  redirected?: boolean
  type?: OhNetResponseKind
  data?: T
  body?: unknown
}

export interface OhNetConfig extends OhNetRequestConfig {
  adapter?: OhNetAdapter
}
