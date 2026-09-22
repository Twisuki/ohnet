import type { OhNetAdapter } from "../adapter/types"
import type { OhNetContext } from "../core/types"
import type {
  OhNetMiddleware,
  OhNetMiddlewareEnterControls,
  OhNetMiddlewareLeaveControls,
} from "./types"
import { BaseOhNetError } from "../model/error"

export async function run(context: OhNetContext, func: () => Promise<unknown>): Promise<void> {
  try {
    await func()
  }
  catch (error) {
    context.error = error instanceof BaseOhNetError
      ? error
      : new BaseOhNetError("INTERNAL", 0, "internal error", undefined, error)
  }
}

export async function compose(
  adapter: OhNetAdapter,
  context: OhNetContext,
  middlewares: OhNetMiddleware[],
): Promise<void> {
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

  if (!terminated && !skipped) {
    await run(context, async () => {
      context.response = await adapter(context)
    })
  }

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
}
