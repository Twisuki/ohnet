import { OHNET_UNKNOWN_ERROR_CODE } from "@twisuki/ohnet"
import { describe, expect, it } from "vitest"

describe("hello", () => {
  it("world", () => {
    expect("hello world").toBe("hello world")
    expect(OHNET_UNKNOWN_ERROR_CODE).toBe("OHNET_UNKNOWN")
  })
})
