export class OhNetError extends Error {
  type: string
  code: string
  message: string
  data?: unknown
  error?: unknown

  constructor(type: string, code: string, message: string, data?: unknown, error?: unknown) {
    super(`[${code}] ${message}`)
    this.type = type
    this.code = code
    this.message = message
    this.data = data
    this.error = error
  }
}
