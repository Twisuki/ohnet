import type { OhNetResponse, OhNetResponseInit } from "./types"
import { OhNetHeader } from "../model/header"

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
