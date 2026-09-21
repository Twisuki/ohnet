import type { OhNetContext, OhNetRequest, OhNetResponse } from "./types"
import { DEFAULT_OHNET_REQUEST } from "./config"

function copyRequest(request: OhNetRequest): OhNetRequest {
  return {
    ...request,
    headers: request.headers.clone(),
  }
}

function copyResponse(response: OhNetResponse): OhNetResponse {
  return {
    ...response,
    headers: response.headers.clone(),
  }
}

export function copyContext(context: OhNetContext): OhNetContext {
  return {
    request: copyRequest(context.request),
    response: context.response ? copyResponse(context.response) : null,
    error: context.error,
    meta: { ...context.meta },
  }
}

export function createDefaultContext(): OhNetContext {
  return {
    request: copyRequest(DEFAULT_OHNET_REQUEST),
    response: null,
    error: null,
    meta: {},
  }
}
