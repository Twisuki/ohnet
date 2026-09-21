import type { OhNetRequest, OhNetRequestConfig, OhNetResponse, OhNetResponseInit } from "./types"
import { OhNetHeader } from "./header"
import { DEFAULT_TRANSFORM_REQUEST } from "./transform"

export function createResponse<T = unknown>(init: OhNetResponseInit<T> = {}): OhNetResponse<T> {
  const status = init.status ?? 0
  return {
    status,
    statusText: init.statusText ?? "",
    ok: init.ok ?? (status >= 200 && status < 300),
    headers: OhNetHeader.from(init.headers),
    url: init.url ?? "",
    redirected: init.redirected ?? false,
    type: init.type ?? "default",
    data: init.data as T,
    body: init.body,
  }
}

export function resolveRequest(base: OhNetRequest, config: OhNetRequestConfig): OhNetRequest {
  const request: OhNetRequest = { ...base, headers: base.headers.clone() }

  if (config.url !== undefined)
    request.url = config.url
  if (config.method !== undefined)
    request.method = config.method
  if (config.headers !== undefined)
    request.headers = request.headers.concat(config.headers)
  if (config.params !== undefined)
    request.params = config.params
  if (config.signal !== undefined)
    request.signal = config.signal
  if (config.timeout !== undefined)
    request.timeout = config.timeout
  if (config.responseType !== undefined)
    request.responseType = config.responseType
  if (config.transformRequest !== undefined)
    request.transformRequest = config.transformRequest
  if (config.data !== undefined) {
    const transforms = request.transformRequest ?? DEFAULT_TRANSFORM_REQUEST
    let body: unknown = config.data
    for (const transform of transforms)
      body = transform(body, request.headers, config)
    request.body = body
  }

  return request
}
