import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import HeistsDashboard from "@/components/HeistsDashboard"

const { useHeists } = vi.hoisted(() => ({ useHeists: vi.fn() }))

vi.mock("@/hooks/useHeists", () => ({ default: useHeists }))
vi.mock("@/components/HeistCard", () => ({
  default: ({ heist }: { heist: { id: string } }) => <div data-testid={`card-${heist.id}`} />,
}))
vi.mock("@/components/HeistCardSkeleton", () => ({
  default: () => <div data-testid="card-skeleton" />,
}))
vi.mock("@/components/ExpiredHeistCard", () => ({
  default: ({ heist }: { heist: { id: string } }) => <div data-testid={`expired-card-${heist.id}`} />,
}))
vi.mock("@/components/ExpiredHeistCardSkeleton", () => ({
  default: () => <div data-testid="expired-card-skeleton" />,
}))

const deadline = new Date("2026-08-12T12:00:00.000Z")

function heist(id: string, title: string) {
  return { id, title, deadline }
}

const heistsByMode: Record<string, { heists: ReturnType<typeof heist>[]; loading: boolean }> = {
  active: { heists: [heist("a1", "Liberate the good stapler")], loading: false },
  assigned: {
    heists: [heist("s1", "Rename the shared printer"), heist("s2", "Hide the mouse pad")],
    loading: false,
  },
  expired: { heists: [heist("e1", "Swap the coffee for decaf")], loading: false },
}

// the section each heading belongs to, so cards can be checked in place
function sectionFor(name: string) {
  return screen.getByRole("heading", { name }).closest("div") as HTMLElement
}

describe("HeistsDashboard", () => {
  beforeEach(() => {
    useHeists.mockImplementation((mode: string) => heistsByMode[mode] ?? { heists: [], loading: false })
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

    expect(within(section).getByTestId("card-a1")).toBeInTheDocument()
  })

  it("lists the assigned heists under their own heading", () => {
    render(<HeistsDashboard />)

    const section = sectionFor("Heists You've Assigned")

    expect(within(section).getByTestId("card-s1")).toBeInTheDocument()
    expect(within(section).getByTestId("card-s2")).toBeInTheDocument()
  })

  it("lists the expired heists under their own heading", () => {
    render(<HeistsDashboard />)

    const section = sectionFor("All Expired Heists")

    expect(within(section).getByTestId("expired-card-e1")).toBeInTheDocument()
  })

  it("never spills one slice's heists into another section", () => {
    render(<HeistsDashboard />)

    const active = sectionFor("Your Active Heists")

    expect(within(active).queryByTestId("card-s1")).not.toBeInTheDocument()
    expect(within(active).queryByTestId("expired-card-e1")).not.toBeInTheDocument()
  })

  it("never renders expired heists as cards", () => {
    render(<HeistsDashboard />)

    expect(screen.queryByTestId("card-e1")).not.toBeInTheDocument()
  })

  it("shows skeleton placeholders while a mode is loading", () => {
    useHeists.mockImplementation((mode: string) =>
      mode === "active" ? { heists: [], loading: true } : (heistsByMode[mode] ?? { heists: [], loading: false }),
    )

    render(<HeistsDashboard />)

    const section = sectionFor("Your Active Heists")

    expect(within(section).getAllByTestId("card-skeleton")).toHaveLength(3)
    expect(within(section).queryByTestId(/^card-(?!skeleton)/)).not.toBeInTheDocument()
  })

  it("shows skeleton placeholders while expired heists are loading", () => {
    useHeists.mockImplementation((mode: string) =>
      mode === "expired" ? { heists: [], loading: true } : (heistsByMode[mode] ?? { heists: [], loading: false }),
    )

    render(<HeistsDashboard />)

    const section = sectionFor("All Expired Heists")

    expect(within(section).getAllByTestId("expired-card-skeleton")).toHaveLength(3)
    expect(within(section).queryByTestId(/^expired-card-(?!skeleton)/)).not.toBeInTheDocument()
  })

  it("shows neither cards nor skeletons when a mode is genuinely empty", () => {
    useHeists.mockImplementation((mode: string) =>
      mode === "active" ? { heists: [], loading: false } : (heistsByMode[mode] ?? { heists: [], loading: false }),
    )

    render(<HeistsDashboard />)

    const section = sectionFor("Your Active Heists")

    expect(within(section).queryAllByTestId("card-skeleton")).toHaveLength(0)
    expect(within(section).queryByTestId(/^card-/)).not.toBeInTheDocument()
  })

  it("keeps the headings up with nothing to show under them", () => {
    useHeists.mockReturnValue({ heists: [], loading: false })

    render(<HeistsDashboard />)

    expect(screen.getByRole("heading", { name: "Your Active Heists" })).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })
})
