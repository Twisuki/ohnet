export type OhNetMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

export type OhNetResponseType = "auto" | "json" | "text" | "arraybuffer" | "blob" | "stream" | "raw"

export type OhNetResponseKind = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"

export type OhNetParams
  = | string
    | Record<string, unknown>
    | Iterable<readonly [string, string]>
