import type { OhNetRequest } from "./types"
import { OhNetHeader } from "../model/header"

export const DEFAULT_OHNET_REQUEST: OhNetRequest = {
  url: "",
  method: "GET",
  headers: new OhNetHeader(),
  responseType: "auto",
}
