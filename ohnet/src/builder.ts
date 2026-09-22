import type { OhNetAdapter } from "./adapter/types"
import type { OhNetConfig } from "./context/types"
import type { OhNetContext, OhNetParams } from "./core/types"
import type { BaseOhNetMiddleware } from "./pipeline/middleware"
import { resolveRequest } from "./context/request"
import { appendQuery, buildQueryString, copyContext, createDefaultContext } from "./context/utils"
import { BaseOhNetError } from "./model/error"
import { pipeline } from "./pipeline/scheduler"

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

  get<T>(path?: string, params?: OhNetParams, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "GET", params, data })
  }

  post<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "POST", data })
  }

  put<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "PUT", data })
  }

  delete<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "DELETE", data })
  }

  patch<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "PATCH", data })
  }

  head<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "HEAD", data })
  }

  options<T>(path?: string, data?: unknown): Promise<T> {
    return this.append(path ?? "").request<T>({ method: "OPTIONS", data })
  }

  private applyConfig(config: OhNetConfig): void {
    this.context.request = resolveRequest(this.context.request, config)
  }

  private async run<T>(): Promise<T> {
    if (!this.adapter) {
      throw new Error("No adapter configured")
    }

    const { params } = this.context.request
    if (params !== undefined) {
      this.context.request.url = appendQuery(this.context.request.url, buildQueryString(params))
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
