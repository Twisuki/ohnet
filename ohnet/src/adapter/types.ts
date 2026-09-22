import type { OhNetContext, OhNetResponse } from "../core/types"

export type OhNetAdapter = (context: OhNetContext) => Promise<OhNetResponse>
