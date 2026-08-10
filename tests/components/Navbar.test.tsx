import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

// component imports
import Navbar from "@/components/Navbar"

// LogoutButton reads auth state, which needs a provider it is tested with
// separately — the nav only cares that it renders the child, not what it does
vi.mock("@/components/LogoutButton", () => ({ default: () => null }))

describe("Navbar", () => {
  it("renders the main heading", () => {
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create New Heist link", () => {
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create new heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })
})
