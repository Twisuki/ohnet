import type { OhNetContext } from "./types"
import { DEFAULT_OHNET_REQUEST } from "./config"

export function deepCopy<T>(source: T): T {
  if (source === null || typeof source !== "object") {
    return source
  }

  if (Array.isArray(source)) {
    const arr: unknown[] = []
    for (const item of source) {
      arr.push(deepCopy(item))
    }
    return arr as T
  }

  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(source as object)) {
    obj[key] = deepCopy((source as Record<string, unknown>)[key])
  }
  return obj as T
}

export function createDefaultContext(): OhNetContext {
  return {
    request: deepCopy(DEFAULT_OHNET_REQUEST),
    response: null,
    error: null,
    meta: {},
  }
}
