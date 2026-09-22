import type { OhNetRequestConfig } from "@/context/types"
import type { OhNetRequest } from "@/types"

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
  if (config.data !== undefined)
    request.data = config.data

  return request
}
