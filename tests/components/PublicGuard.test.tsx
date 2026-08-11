import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import PublicGuard from "@/components/PublicGuard"

const { useUser, replace, pathname } = vi.hoisted(() => ({
  useUser: vi.fn(),
  replace: vi.fn(),
  pathname: vi.fn(),
}))

vi.mock("@/hooks/useUser", () => ({ default: useUser }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname(),
}))

const ghost = { uid: "heist-1", email: "ghost@heist.dev", displayName: "Ghost" }

function renderGuard() {
  return render(
    <PublicGuard>
      <p>Log in to Your Account</p>
    </PublicGuard>,
  )
}

describe("PublicGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    useUser.mockReturnValue({ user: null, loading: false })
    pathname.mockReturnValue("/login")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("holds on the loader while firebase is still restoring the session", () => {
    useUser.mockReturnValue({ user: null, loading: true })

    renderGuard()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Log in to Your Account")).not.toBeInTheDocument()
  })

  it("stays put rather than redirecting while still loading", () => {
    useUser.mockReturnValue({ user: null, loading: true })

    renderGuard()

    expect(replace).not.toHaveBeenCalled()
  })

  it("shows the page to a signed-out visitor", () => {
    renderGuard()

    expect(screen.getByText("Log in to Your Account")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("leaves a signed-out visitor where they are", () => {
    renderGuard()

    expect(replace).not.toHaveBeenCalled()
  })

  it("sends a signed-in user on to their heists", async () => {
    useUser.mockReturnValue({ user: ghost, loading: false })
    pathname.mockReturnValue("/signup")

    renderGuard()

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/heists")
    })
  })

  it("never shows the page to a signed-in user on the way out", () => {
    useUser.mockReturnValue({ user: ghost, loading: false })

    renderGuard()

    expect(screen.queryByText("Log in to Your Account")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("sends a signed-in user off the splash page to their heists", async () => {
    useUser.mockReturnValue({ user: ghost, loading: false })
    pathname.mockReturnValue("/")

    renderGuard()

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/heists")
    })
  })

  it("sends a signed-out visitor off the splash page to the login page", async () => {
    pathname.mockReturnValue("/")

    renderGuard()

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login")
    })
  })

  it("never renders the splash page in place", () => {
    pathname.mockReturnValue("/")

    renderGuard()

    expect(screen.queryByText("Log in to Your Account")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("waits for the session before deciding where to send a splash visitor", () => {
    useUser.mockReturnValue({ user: null, loading: true })
    pathname.mockReturnValue("/")

    renderGuard()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("leaves the preview page alone for a signed-in user", () => {
    useUser.mockReturnValue({ user: ghost, loading: false })
    pathname.mockReturnValue("/preview")

    renderGuard()

    expect(screen.getByText("Log in to Your Account")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("leaves the preview page alone for a signed-out visitor", () => {
    pathname.mockReturnValue("/preview")

    renderGuard()

    expect(screen.getByText("Log in to Your Account")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("shows the preview page without waiting on the session", () => {
    useUser.mockReturnValue({ user: null, loading: true })
    pathname.mockReturnValue("/preview")

    renderGuard()

    expect(screen.getByText("Log in to Your Account")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
