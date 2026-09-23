import type { OhNetContext, OhNetResponse, OhNetResponseType } from "@/types"
import { OHNET_ERROR_CODE, OHNET_ERROR_MESSAGE, OhNetInternalError } from "@/config/error"
import { createResponse } from "@/context/response"
import { OhNetHeader } from "@/model/header"
import { subscribeAbort } from "@/model/signal"

function isJsonData(data: unknown): boolean {
  if (typeof data !== "object" || data === null)
    return false
  const tag = Object.prototype.toString.call(data)
  return tag === "[object Object]" || tag === "[object Array]"
}

async function serializeBody(
  data: unknown,
  headers: OhNetHeader,
): Promise<unknown> {
  if (!isJsonData(data))
    return data
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json")
  return JSON.stringify(data)
}

async function parseData(response: Response, responseType: OhNetResponseType): Promise<unknown> {
  switch (responseType) {
    case "text":
      return response.text()
    case "arraybuffer":
      return response.arrayBuffer()
    case "blob":
      return response.blob()
    case "stream":
      return response.body
    case "raw":
      return response
    case "json":
      return response.json().catch(() => null)
    default: {
      const contentType = response.headers.get("content-type") || ""
      return contentType.includes("application/json")
        ? response.json().catch(() => null)
        : response.text()
    }
  }
}

/**
 * Default transport built on the global `fetch`.
 *
 * @remarks
 * Throws `OHNET_NO_FETCH` when unavailable; otherwise bridges the
 * user `signal`, enforces `request.timeout` via `setTimeout`, and
 * JSON-encodes plain object / array bodies.
 */
export async function fetchAdapter(context: OhNetContext): Promise<OhNetResponse> {
  if (typeof globalThis.fetch !== "function") {
    throw new OhNetInternalError(OHNET_ERROR_CODE.NO_FETCH, OHNET_ERROR_MESSAGE.NO_FETCH)
  }

  const { url, method, headers, data, signal, timeout, responseType } = context.request

  const controller = new AbortController()
  const unsubscribe = subscribeAbort(signal, () => controller.abort())

  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  if (timeout !== undefined) {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeout)
  }

  const outgoingHeaders = headers.clone()
  const body = await serializeBody(data, outgoingHeaders)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: outgoingHeaders.toRecord(),
      body: body as BodyInit | undefined,
      signal: controller.signal,
    })
  }
  catch (error) {
    if (timedOut) {
      throw new OhNetInternalError(OHNET_ERROR_CODE.TIMEOUT, OHNET_ERROR_MESSAGE.TIMEOUT, undefined, error)
    }
    if (signal?.aborted) {
      throw new OhNetInternalError(OHNET_ERROR_CODE.ABORT, OHNET_ERROR_MESSAGE.ABORT, signal.reason, error)
    }
    throw new OhNetInternalError(OHNET_ERROR_CODE.NETWORK, OHNET_ERROR_MESSAGE.NETWORK, undefined, error)
  }
  finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    unsubscribe()
  }

  const parsedData = await parseData(response, responseType)

  return createResponse({
    status: response.status,
    statusText: response.statusText,
    headers: OhNetHeader.from(response.headers),
    url: response.url,
    redirected: response.redirected,
    type: response.type,
    data: parsedData,
  })
}
