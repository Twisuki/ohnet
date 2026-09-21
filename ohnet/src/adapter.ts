import type { OhNetContext, OhNetResponse } from "./types"
import { BaseOhNetError } from "./error"
import { OhNetHeader } from "./header"

export async function fetchAdapter(context: OhNetContext): Promise<OhNetResponse> {
  const { url, method, headers, body, signal, timeout } = context.request

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
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  const responseHeaders = OhNetHeader.from(response.headers)

  let data: unknown
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    try {
      data = await response.json()
    }
    catch {
      data = null
    }
  }
  else {
    data = await response.text()
  }

  return {
    status: response.status,
    text: response.statusText,
    headers: responseHeaders,
    data,
  }
}
