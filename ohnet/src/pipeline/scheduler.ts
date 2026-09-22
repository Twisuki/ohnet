import type { OhNetAdapter } from "../adapter/types"
import type { OhNetContext } from "../core/types"
import type { BaseOhNetMiddleware } from "./middleware"
import { BaseOhNetError } from "../model/error"

async function runRequestPipeline(
  context: OhNetContext,
  middlewares: BaseOhNetMiddleware[],
  adapter: OhNetAdapter,
): Promise<{ ctx: OhNetContext, proceed: boolean }> {
  let index = 0
  const ctx = context

  const next = async (currentCtx: OhNetContext): Promise<OhNetContext> => {
    const middleware = middlewares[index++]

    if (!middleware)
      return currentCtx

    if (middleware.onStart) {
      let called = false
      return middleware.onStart(adapter, currentCtx, async (passedCtx) => {
        if (called) {
          throw new Error("next() called multiple times")
        }
        called = true
        return next(passedCtx)
      })
    }
    else {
      return next(currentCtx)
    }
  }

  const finalCtx = await next(ctx)
  return { ctx: finalCtx, proceed: index >= middlewares.length }
}

async function runResponsePipeline(
  context: OhNetContext,
  middlewares: BaseOhNetMiddleware[],
  adapter: OhNetAdapter,
): Promise<OhNetContext> {
  let index = middlewares.length - 1
  const ctx = context

  const next = async (currentCtx: OhNetContext): Promise<OhNetContext> => {
    const middleware = middlewares[index--]

    if (!middleware)
      return currentCtx

    const hook = currentCtx.error ? middleware.onError : middleware.onSuccess

    if (hook) {
      let called = false
      return hook(adapter, currentCtx, async (passedCtx) => {
        if (called) {
          throw new Error("next() called multiple times")
        }
        called = true
        return next(passedCtx)
      })
    }
    else {
      return next(currentCtx)
    }
  }

  return next(ctx)
}

export async function pipeline(
  context: OhNetContext,
  middlewares: BaseOhNetMiddleware[],
  adapter: OhNetAdapter,
): Promise<OhNetContext> {
  const { ctx: ctxAfterStart, proceed } = await runRequestPipeline(context, middlewares, adapter)
  if (!proceed || ctxAfterStart.error)
    return ctxAfterStart

  let ctx: OhNetContext
  try {
    const response = await adapter(ctxAfterStart)
    ctx = { ...ctxAfterStart, response, error: null }
  }
  catch (error) {
    const classified = error instanceof BaseOhNetError
      ? error
      : new BaseOhNetError("INTERNAL", 0, "internal error", undefined, error)
    ctx = { ...ctxAfterStart, response: null, error: classified }
  }

  return runResponsePipeline(ctx, middlewares, adapter)
}
