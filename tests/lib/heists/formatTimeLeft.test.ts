import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { formatTimeLeft } from "@/lib/heists/formatTimeLeft"

const now = new Date("2026-08-10T09:00:00.000Z")

describe("formatTimeLeft", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows hours left when more than an hour remains", () => {
    const deadline = new Date(now.getTime() + 47 * 60 * 60 * 1000)

    expect(formatTimeLeft(deadline)).toBe("47h left")
  })

  it("shows an hour left rather than rolling over to minutes at the boundary", () => {
    const deadline = new Date(now.getTime() + 60 * 60 * 1000)

    expect(formatTimeLeft(deadline)).toBe("1h left")
  })

  it("shows minutes left once under an hour remains", () => {
    const deadline = new Date(now.getTime() + 45 * 60 * 1000)

    expect(formatTimeLeft(deadline)).toBe("45m left")
  })

  it("never shows 0m left while time genuinely remains", () => {
    const deadline = new Date(now.getTime() + 10 * 1000)

    expect(formatTimeLeft(deadline)).toBe("1m left")
  })

  it("shows the deadline has passed once it's in the past", () => {
    const deadline = new Date(now.getTime() - 1000)

    expect(formatTimeLeft(deadline)).toBe("Deadline passed")
  })

  it("shows the deadline has passed when it lands exactly now", () => {
    expect(formatTimeLeft(now)).toBe("Deadline passed")
  })
})
