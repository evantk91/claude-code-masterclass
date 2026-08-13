import { describe, it, expect } from "vitest"

// component imports
import { formatDeadline } from "@/lib/heists/formatDeadline"

describe("formatDeadline", () => {
  it("formats an afternoon deadline with a comma-separated date and 12-hour time", () => {
    const deadline = new Date(2026, 11, 3, 14, 30)

    expect(formatDeadline(deadline)).toBe("Dec 3, 02:30 PM")
  })

  it("formats a morning deadline with a leading-zero hour", () => {
    const deadline = new Date(2026, 0, 9, 9, 5)

    expect(formatDeadline(deadline)).toBe("Jan 9, 09:05 AM")
  })

  it("formats midnight as 12 AM rather than 00", () => {
    const deadline = new Date(2026, 5, 1, 0, 0)

    expect(formatDeadline(deadline)).toBe("Jun 1, 12:00 AM")
  })
})
