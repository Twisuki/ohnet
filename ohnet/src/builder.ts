import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetConfig } from "@/context/types"
import type { OhNetMiddleware } from "@/middleware/types"
import type { OhNetContext, OhNetParams } from "@/types"
import { OHNET_ERROR_CODE, OHNET_ERROR_MESSAGE, OhNetInternalError } from "@/config/error"
import { resolveRequest } from "@/context/request"
import { appendQuery, buildQueryString, copyContext, createDefaultContext } from "@/context/utils"
import { compose } from "@/middleware/dispatcher"

export class OhNetBuilder {
  #adapter: OhNetAdapter | null
  #context: OhNetContext
  #middlewares: OhNetMiddleware[] = []

  constructor(config: OhNetConfig) {
    this.#adapter = config.adapter ?? null
    this.#context = createDefaultContext()
    this.applyConfig(config)
  }

  fork(config: OhNetConfig = {}): OhNetBuilder {
    const child = new OhNetBuilder({})
    child.#adapter = this.#adapter
    child.#context = copyContext(this.#context)
    child.#context.meta = {}
    child.#middlewares = [...this.#middlewares]

    child.applyConfig(config)
    return child
  }

  add(config: OhNetConfig): OhNetBuilder {
    return this.fork(config)
  }

  with(middleware: OhNetMiddleware): OhNetBuilder {
    return this.fork().register(middleware)
  }

  has(name: string): boolean {
    return this.#middlewares.some(middleware => middleware.name === name)
  }

  find(name: string): OhNetMiddleware | undefined {
    return this.#middlewares.find(middleware => middleware.name === name)
  }

  clean(name: string): OhNetBuilder {
    const child = this.fork()
    child.#middlewares = child.#middlewares.filter(middleware => middleware.name !== name)
    return child
  }

  append(path: string): OhNetBuilder {
    return this.fork({ url: this.#context.request.url + path })
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

  private register(middleware: OhNetMiddleware): this {
    const name = middleware.name
    if (typeof name !== "string" || name.trim() === "") {
      throw new OhNetInternalError(OHNET_ERROR_CODE.MIDDLEWARE_NAME, OHNET_ERROR_MESSAGE.MIDDLEWARE_NAME)
    }

    const index = this.#middlewares.findIndex(existing => existing.name === name)
    if (index === -1)
      this.#middlewares.push(middleware)
    else
      this.#middlewares[index] = middleware

    return this
  }

  private applyConfig(config: OhNetConfig): void {
    this.#context.request = resolveRequest(this.#context.request, config)
  }

  private async run<T>(): Promise<T> {
    if (!this.#adapter) {
      throw new OhNetInternalError(OHNET_ERROR_CODE.NO_ADAPTER, OHNET_ERROR_MESSAGE.NO_ADAPTER)
    }

    const { params } = this.#context.request
    if (params !== undefined) {
      this.#context.request.url = appendQuery(this.#context.request.url, buildQueryString(params))
    }

    await compose(this.#adapter, this.#context, this.#middlewares)
    if (this.#context.error) {
      throw this.#context.error
    }
    if (!this.#context.response) {
      throw new OhNetInternalError(OHNET_ERROR_CODE.NO_RESPONSE, OHNET_ERROR_MESSAGE.NO_RESPONSE)
    }
    return this.#context.response.data as T
  }
}
