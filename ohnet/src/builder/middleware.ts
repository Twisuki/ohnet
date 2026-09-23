import type { OhNetMiddleware } from "@/middleware/types"
import { OHNET_ERROR_CODE, OHNET_ERROR_MESSAGE, OhNetInternalError } from "@/config/error"

export class OhNetMiddlewareBuilder {
  #middlewares: OhNetMiddleware[]

  constructor() {
    this.#middlewares = []
  }

  fork(middlewares: OhNetMiddleware[]): OhNetMiddlewareBuilder {
    const child = new OhNetMiddlewareBuilder()
    child.#middlewares = [...middlewares]
    return child
  }

  list(): OhNetMiddleware[] {
    return this.#middlewares.slice()
  }

  has(name: string): boolean {
    return this.#middlewares.some(middleware => middleware.name === name)
  }

  get(name: string): OhNetMiddleware | undefined {
    return this.#middlewares.find(middleware => middleware.name === name)
  }

  with(middleware: OhNetMiddleware): OhNetMiddlewareBuilder {
    const name = middleware.name
    if (typeof name !== "string" || name.trim() === "") {
      throw new OhNetInternalError(OHNET_ERROR_CODE.MIDDLEWARE_NAME, OHNET_ERROR_MESSAGE.MIDDLEWARE_NAME)
    }

    const next = [...this.#middlewares]
    const index = next.findIndex(existing => existing.name === name)
    if (index === -1)
      next.push(middleware)
    else
      next[index] = middleware
    return this.fork(next)
  }

  clean(name: string): OhNetMiddlewareBuilder {
    const next = this.#middlewares.filter(middleware => middleware.name !== name)
    return this.fork(next)
  }
}
