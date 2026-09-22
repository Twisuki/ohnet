import type { OhNetContext, OhNetResponse } from "@/types"

export type OhNetAdapter = (context: OhNetContext) => Promise<OhNetResponse>
