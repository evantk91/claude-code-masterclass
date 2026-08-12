import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import HeistsDashboard from "@/components/HeistsDashboard"

const { useHeists } = vi.hoisted(() => ({ useHeists: vi.fn() }))

vi.mock("@/hooks/useHeists", () => ({ default: useHeists }))

const deadline = new Date("2026-08-12T12:00:00.000Z")

function heist(id: string, title: string) {
  return { id, title, deadline }
}

const heistsByMode: Record<string, ReturnType<typeof heist>[]> = {
  active: [heist("a1", "Liberate the good stapler")],
  assigned: [heist("s1", "Rename the shared printer"), heist("s2", "Hide the mouse pad")],
  expired: [heist("e1", "Swap the coffee for decaf")],
}

// the section each heading belongs to, so titles can be checked in place
function sectionFor(name: string) {
  return screen.getByRole("heading", { name }).closest("div") as HTMLElement
}

describe("HeistsDashboard", () => {
  beforeEach(() => {
    useHeists.mockImplementation((mode: string) => heistsByMode[mode] ?? [])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("asks for each slice of the collection once", () => {
    render(<HeistsDashboard />)

    expect(useHeists).toHaveBeenCalledWith("active")
    expect(useHeists).toHaveBeenCalledWith("assigned")
    expect(useHeists).toHaveBeenCalledWith("expired")
  })

  it("lists the active heists under their own heading", () => {
    render(<HeistsDashboard />)

    const section = sectionFor("Your Active Heists")

    expect(within(section).getByText("Liberate the good stapler")).toBeInTheDocument()
    expect(within(section).getAllByRole("listitem")).toHaveLength(1)
  })

  it("lists the assigned heists under their own heading", () => {
    render(<HeistsDashboard />)

    const section = sectionFor("Heists You've Assigned")

    expect(within(section).getByText("Rename the shared printer")).toBeInTheDocument()
    expect(within(section).getByText("Hide the mouse pad")).toBeInTheDocument()
    expect(within(section).getAllByRole("listitem")).toHaveLength(2)
  })

  it("lists the expired heists under their own heading", () => {
    render(<HeistsDashboard />)

    const section = sectionFor("All Expired Heists")

    expect(within(section).getByText("Swap the coffee for decaf")).toBeInTheDocument()
    expect(within(section).getAllByRole("listitem")).toHaveLength(1)
  })

  it("never spills one slice's heists into another section", () => {
    render(<HeistsDashboard />)

    const active = sectionFor("Your Active Heists")

    expect(within(active).queryByText("Rename the shared printer")).not.toBeInTheDocument()
    expect(within(active).queryByText("Swap the coffee for decaf")).not.toBeInTheDocument()
  })

  it("keeps the headings up with nothing to show under them", () => {
    useHeists.mockReturnValue([])

    render(<HeistsDashboard />)

    expect(screen.getByRole("heading", { name: "Your Active Heists" })).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })
})
