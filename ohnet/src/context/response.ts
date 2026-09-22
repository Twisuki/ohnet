import type { OhNetResponse } from "../types"
import type { OhNetResponseLike } from "./types"
import { OhNetHeader } from "../model/header"

export function createResponse<T>(input: OhNetResponseLike<T>): OhNetResponse<T> {
  const status = input.status
  const result: OhNetResponse<T> = {
    status,
    statusText: input.statusText ?? "",
    ok: input.ok ?? (status >= 200 && status < 300),
    headers: OhNetHeader.from(input.headers),
    url: input.url,
    redirected: input.redirected ?? false,
    type: input.type ?? "default",
    data: input.data as T,
    body: input.body,
  }
  return result
}
