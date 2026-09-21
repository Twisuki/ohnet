import type { OhNetContext, OhNetResponse, OhNetResponseType } from "./types"
import { BaseOhNetError } from "./error"
import { createResponse } from "./factory"
import { OhNetHeader } from "./header"

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

  if (signal?.aborted) {
    controller.abort()
  }
  else if (signal) {
    signal.onAbort = () => controller.abort()
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  if (timeout !== undefined) {
    timer = setTimeout(() => controller.abort(), timeout)
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
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    if (signal?.aborted) {
      throw new BaseOhNetError("ABORT", -2, "aborted", undefined, error)
    }
    throw new BaseOhNetError("NETWORK", -1, "network error", undefined, error)
  }

  if (timer !== undefined) {
    clearTimeout(timer)
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
