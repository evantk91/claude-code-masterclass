import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import AuthGuard from "@/components/AuthGuard"

const { useUser, replace } = vi.hoisted(() => ({ useUser: vi.fn(), replace: vi.fn() }))

vi.mock("@/hooks/useUser", () => ({ default: useUser }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }))

const ghost = { uid: "heist-1", email: "ghost@heist.dev", displayName: "Ghost" }

function renderGuard() {
  return render(
    <AuthGuard>
      <p>Heists you have assigned</p>
    </AuthGuard>,
  )
}

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    useUser.mockReturnValue({ user: ghost, loading: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("holds on the loader while firebase is still restoring the session", () => {
    useUser.mockReturnValue({ user: null, loading: true })

    renderGuard()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Heists you have assigned")).not.toBeInTheDocument()
  })

  it("stays put rather than redirecting while still loading", () => {
    useUser.mockReturnValue({ user: null, loading: true })

    renderGuard()

    expect(replace).not.toHaveBeenCalled()
  })

  it("shows the page to a signed-in user", () => {
    renderGuard()

    expect(screen.getByText("Heists you have assigned")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("leaves a signed-in user where they are", () => {
    renderGuard()

    expect(replace).not.toHaveBeenCalled()
  })

  it("sends a signed-out visitor to the login page", async () => {
    useUser.mockReturnValue({ user: null, loading: false })

    renderGuard()

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login")
    })
  })

  it("never shows the page to a signed-out visitor on the way out", () => {
    useUser.mockReturnValue({ user: null, loading: false })

    renderGuard()

    expect(screen.queryByText("Heists you have assigned")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})
