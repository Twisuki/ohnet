import type { BaseOhNetMiddleware, OhNetAdapter, OhNetConfig, OhNetContext } from "./types"
import { BaseOhNetError } from "./error"
import { pipeline } from "./pipeline"
import { copyContext, createDefaultContext } from "./utils"

export class OhNetBuilder {
  adapter: OhNetAdapter | null = null
  context: OhNetContext = createDefaultContext()
  middlewares: BaseOhNetMiddleware[] = []

  constructor(config: OhNetConfig) {
    this.adapter = config.adapter ?? null
    this.applyConfig(config)
  }

  fork(config: OhNetConfig = {}): OhNetBuilder {
    const child = new OhNetBuilder({})
    child.adapter = this.adapter
    child.context = copyContext(this.context)
    child.context.meta = {}
    child.middlewares = [...this.middlewares]

    child.applyConfig(config)
    return child
  }

  add(config: OhNetConfig): OhNetBuilder {
    return this.fork(config)
  }

  with(middleware: BaseOhNetMiddleware): OhNetBuilder {
    const child = this.fork()
    child.middlewares = [...child.middlewares, middleware]
    return child
  }

  append(path: string): OhNetBuilder {
    return this.fork({ url: this.context.request.url + path })
  }

  async request<T>(config: OhNetConfig = {}): Promise<T> {
    return this.fork(config).run<T>()
  }

  get<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "GET", body: data })
  }

  post<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "POST", body: data })
  }

  put<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "PUT", body: data })
  }

  delete<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "DELETE", body: data })
  }

  patch<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "PATCH", body: data })
  }

  head<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "HEAD", body: data })
  }

  options<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "OPTIONS", body: data })
  }

  private applyConfig(config: OhNetConfig): void {
    const { url, method, headers, body, signal, timeout } = config
    if (url !== undefined)
      this.context.request.url = url
    if (method !== undefined)
      this.context.request.method = method
    if (headers !== undefined)
      this.context.request.headers = this.context.request.headers.concat(headers)
    if (body !== undefined)
      this.context.request.body = body
    if (signal !== undefined)
      this.context.request.signal = signal
    if (timeout !== undefined)
      this.context.request.timeout = timeout
  }

  private async run<T>(): Promise<T> {
    if (!this.adapter) {
      throw new Error("No adapter configured")
    }
    const ctx = await pipeline(this.context, this.middlewares, this.adapter)
    if (ctx.error) {
      throw ctx.error
    }
    if (!ctx.response) {
      throw new BaseOhNetError("INTERNAL", 0, "internal error")
    }
    return ctx.response.data as T
  }
}
