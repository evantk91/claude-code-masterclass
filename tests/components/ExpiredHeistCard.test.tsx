import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import ExpiredHeistCard from "@/components/ExpiredHeistCard"
import { formatDeadline } from "@/lib/heists/formatDeadline"
import type { Heist } from "@/types/firestore/heist"

const baseHeist: Heist = {
  id: "heist-9",
  title: "Relabel the kombucha as decaf",
  description: "Third shelf, break room fridge.",
  createdBy: "uid-1",
  createdByCodename: "GhostQuietOwl",
  assignedTo: "uid-2",
  assignedToCodename: "QuietMidnightCrow",
  createdAt: new Date(2026, 7, 8, 9, 0),
  deadline: new Date(2026, 7, 10, 9, 0),
  finalStatus: "success",
}

describe("ExpiredHeistCard", () => {
  it("renders the title as a link to the heist's detail page", () => {
    render(<ExpiredHeistCard heist={baseHeist} />)

    const link = screen.getByRole("link", { name: baseHeist.title })
    expect(link).toHaveAttribute("href", `/heists/${baseHeist.id}`)
  })

  it("renders the assignee and assigner handles", () => {
    render(<ExpiredHeistCard heist={baseHeist} />)

    expect(screen.getByText(`@${baseHeist.assignedToCodename}`)).toBeInTheDocument()
    expect(screen.getByText(`@${baseHeist.createdByCodename}`)).toBeInTheDocument()
  })

  it("renders the formatted deadline", () => {
    render(<ExpiredHeistCard heist={baseHeist} />)

    expect(screen.getByText(formatDeadline(baseHeist.deadline))).toBeInTheDocument()
  })

  it("shows a success badge when the heist was pulled off", () => {
    render(<ExpiredHeistCard heist={{ ...baseHeist, finalStatus: "success" }} />)

    expect(screen.getByText("SUCCESS")).toBeInTheDocument()
    expect(screen.queryByText("FAILURE")).not.toBeInTheDocument()
  })

  it("shows a failure badge when the heist was blown", () => {
    render(<ExpiredHeistCard heist={{ ...baseHeist, finalStatus: "failure" }} />)

    expect(screen.getByText("FAILURE")).toBeInTheDocument()
    expect(screen.queryByText("SUCCESS")).not.toBeInTheDocument()
  })
})
