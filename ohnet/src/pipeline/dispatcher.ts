import type { OhNetAdapter } from "@/adapter/types"
import type { OhNetEventBuilder } from "@/builder/event"
import type {
  OhNetMiddleware,
  OhNetMiddlewareEnterControls,
  OhNetMiddlewareLeaveControls,
} from "@/pipeline/types"
import type { OhNetContext } from "@/types"
import { OhNetUnknownError } from "@/config/error"
import { OhNetError } from "@/model/error"
import { OHNET_EVENT } from "@/pipeline/types"

/**
 * Invokes `func` and routes any thrown error to `context.error`.
 *
 * @remarks
 * `OhNetError` instances are preserved; anything else is wrapped in
 * {@link OhNetUnknownError} with the original value on `error.error`.
 */
export async function run(context: OhNetContext, func: () => Promise<unknown>): Promise<void> {
  try {
    await func()
  }
  catch (error) {
    context.error = error instanceof OhNetError
      ? error
      : new OhNetUnknownError(error)
  }
}

/**
 * Runs the middleware pipeline around `adapter` and emits lifecycle
 * events on `events` (when provided).
 *
 * @remarks
 * See {@link OHNET_EVENT} for the event order; this function layers
 * the `skip` / `terminate` control flow on top of it. Returns
 * `true` when the pipeline ran normally, `false` when short-circuited.
 */
export async function compose(
  adapter: OhNetAdapter,
  context: OhNetContext,
  middlewares: OhNetMiddleware[],
  events?: OhNetEventBuilder,
): Promise<boolean> {
  events?.emit(OHNET_EVENT.START, adapter, context)

  const stack: OhNetMiddleware[] = []
  let terminated = false
  let skipped = false

  for (let i = 0; i < middlewares.length; i++) {
    if (terminated || skipped)
      break

    const middleware = middlewares[i]
    if (!middleware.enter && !middleware.leave)
      continue

    stack.push(middleware)
    if (middleware.enter) {
      const enter = middleware.enter
      const controls: OhNetMiddlewareEnterControls = {
        skip: () => { skipped = true },
        terminate: () => { terminated = true },
      }
      await run(context, () => enter(adapter, context, controls))
    }
  }

  events?.emit(OHNET_EVENT.REQUEST, adapter, context)

  if (!terminated && !skipped) {
    await run(context, async () => {
      context.response = await adapter(context)
    })
  }

  events?.emit(OHNET_EVENT.RESPONSE, adapter, context)

  for (let i = stack.length - 1; i >= 0; i--) {
    if (terminated)
      break
    const middleware = stack[i]
    if (!middleware.leave)
      continue
    const leave = middleware.leave
    const controls: OhNetMiddlewareLeaveControls = {
      terminate: () => { terminated = true },
    }
    await run(context, () => leave(adapter, context, controls))
  }

  const normal = !terminated && !skipped

  if (context.error) {
    events?.emit(OHNET_EVENT.ERROR, adapter, context)
  }
  else if (context.response) {
    events?.emit(OHNET_EVENT.SUCCESS, adapter, context)
  }
  else if (!normal) {
    events?.emit(OHNET_EVENT.SKIP, adapter, context)
  }
  events?.emit(OHNET_EVENT.FINISH, adapter, context)

  return normal
}
