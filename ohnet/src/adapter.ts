import type { OhNetContext, OhNetResponse, OhNetResponseType } from "./types"
import { BaseOhNetError } from "./error"
import { createResponse } from "./factory"
import { OhNetHeader } from "./header"
import { subscribeAbort } from "./signal"

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

export async function fetchAdapter(context: OhNetContext): Promise<OhNetResponse> {
  const { url, method, headers, body, signal, timeout, responseType } = context.request

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

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: headers.toRecord(),
      body: body as BodyInit | undefined,
      signal: controller.signal,
    })
  }
  catch (error) {
    if (timedOut) {
      throw new BaseOhNetError("TIMEOUT", -3, "timeout", undefined, error)
    }
    if (signal?.aborted) {
      throw new BaseOhNetError("ABORT", -2, "aborted", signal.reason, error)
    }
    throw new BaseOhNetError("NETWORK", -1, "network error", undefined, error)
  }
  finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    unsubscribe()
  }

  const data = await parseData(response, responseType)

  return createResponse({
    status: response.status,
    statusText: response.statusText,
    headers: OhNetHeader.from(response.headers),
    url: response.url,
    redirected: response.redirected,
    type: response.type,
    data,
  })
}
