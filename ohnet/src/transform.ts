import type { OhNetHeader } from "./header"
import type { OhNetParams, OhNetTransformRequest } from "./types"

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof value === "object" && value !== null
    && typeof (value as Iterable<unknown>)[Symbol.iterator] === "function"
}

function stringifyPair(key: string, value: unknown): string[] {
  if (value === undefined || value === null)
    return []
  if (Array.isArray(value))
    return value.flatMap(item => stringifyPair(key, item))
  return [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`]
}

export function buildQueryString(params: OhNetParams): string {
  if (typeof params === "string")
    return params.replace(/^\?/, "")

  const pairs: string[] = []

  if (isIterable(params)) {
    for (const entry of params as Iterable<readonly string[]>)
      pairs.push(...stringifyPair(entry[0], entry[1]))
  }
  else {
    for (const [key, value] of Object.entries(params as Record<string, unknown>))
      pairs.push(...stringifyPair(key, value))
  }

  return pairs.join("&")
}

export function appendQuery(url: string, query: string): string {
  if (!query)
    return url
  return `${url}${url.includes("?") ? "&" : "?"}${query}`
}

function isJsonData(data: unknown): boolean {
  if (typeof data !== "object" || data === null)
    return false
  const tag = Object.prototype.toString.call(data)
  return tag === "[object Object]" || tag === "[object Array]"
}

export const DEFAULT_TRANSFORM_REQUEST: OhNetTransformRequest[] = [
  (data: unknown, headers: OhNetHeader) => {
    if (!isJsonData(data))
      return data
    if (!headers.has("content-type"))
      headers.set("content-type", "application/json")
    return JSON.stringify(data)
  },
]
