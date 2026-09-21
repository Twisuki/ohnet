export class BaseOhNetError extends Error {
  type: string
  code: string | number
  msg: string
  data?: unknown
  error?: unknown

  constructor(type: string, code: string | number, msg: string, data?: unknown, error?: unknown) {
    super(`[${code}] ${msg}`)
    this.type = type
    this.code = code
    this.msg = msg
    this.data = data
    this.error = error
  }
}
