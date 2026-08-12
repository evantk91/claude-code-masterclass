import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import HeistCard from "@/components/HeistCard"
import type { Heist } from "@/types/firestore/heist"

const now = new Date("2026-08-10T09:00:00.000Z")

const heist: Heist = {
  id: "heist-7",
  title: "Liberate the good stapler",
  description: "Third desk from the window. Do not be seen.",
  createdBy: "uid-1",
  createdByCodename: "GhostQuietOwl",
  assignedTo: "uid-2",
  assignedToCodename: "QuietMidnightCrow",
  createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  deadline: new Date(now.getTime() + 6 * 60 * 60 * 1000),
  finalStatus: null,
}

describe("HeistCard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the title as a link to the heist's detail page", () => {
    render(<HeistCard heist={heist} />)

    const link = screen.getByRole("link", { name: heist.title })
    expect(link).toHaveAttribute("href", `/heists/${heist.id}`)
  })

  it("renders the assignee and assigner handles", () => {
    render(<HeistCard heist={heist} />)

    expect(screen.getByText(`@${heist.assignedToCodename}`)).toBeInTheDocument()
    expect(screen.getByText(`@${heist.createdByCodename}`)).toBeInTheDocument()
  })

  it("renders the time left until the deadline", () => {
    render(<HeistCard heist={heist} />)

    expect(screen.getByText("6h left")).toBeInTheDocument()
  })
})
