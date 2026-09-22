import { OhNetError } from "@/model/error"

export const OHNET_ERROR_TYPE = "OHNET_INTERNAL"

export const OHNET_ERROR_CODE = {
  ABORT: "OHNET_ABORT",
  MIDDLEWARE_NAME: "OHNET_MIDDLEWARE_NAME",
  NETWORK: "OHNET_NETWORK",
  NO_ADAPTER: "OHNET_NO_ADAPTER",
  NO_RESPONSE: "OHNET_NO_RESPONSE",
  SKIPPED: "OHNET_SKIPPED",
  TERMINATE: "OHNET_TERMINATE",
  TIMEOUT: "OHNET_TIMEOUT",
} as const satisfies Record<string, string>

export const OHNET_ERROR_MESSAGE = {
  ABORT: "ohnet: aborted",
  MIDDLEWARE_NAME: "ohnet: invalid middleware name",
  NETWORK: "ohnet: network error",
  NO_ADAPTER: "ohnet: no adapter",
  NO_RESPONSE: "ohnet: no response",
  SKIPPED: "ohnet: middleware skipped",
  TERMINATE: "ohnet: middleware terminated",
  TIMEOUT: "ohnet: timeout",
} as const satisfies Record<string, string>

export const OHNET_UNKNOWN_ERROR_TYPE = "OHNET_UNKNOWN"

export const OHNET_UNKNOWN_ERROR_CODE = "OHNET_UNKNOWN"

export const OHNET_UNKNOWN_ERROR_MESSAGE = "ohnet: unknown error"

export class OhNetInternalError extends OhNetError {
  constructor(code: string, message: string, data?: unknown, error?: unknown) {
    super(OHNET_ERROR_TYPE, code, message, data, error)
  }
}

export class OhNetUnknownError extends OhNetError {
  constructor(error?: unknown) {
    super(OHNET_UNKNOWN_ERROR_TYPE, OHNET_UNKNOWN_ERROR_CODE, OHNET_UNKNOWN_ERROR_MESSAGE, undefined, error)
  }
}
