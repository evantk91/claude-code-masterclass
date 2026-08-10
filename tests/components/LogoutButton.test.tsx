import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import LogoutButton from "@/components/LogoutButton"

const { useUser, signOut } = vi.hoisted(() => ({ useUser: vi.fn(), signOut: vi.fn() }))

vi.mock("@/hooks/useUser", () => ({ default: useUser }))
vi.mock("@/lib/auth/signOut", () => ({ signOut }))

const ghost = { uid: "heist-1", email: "ghost@heist.dev", displayName: "Ghost" }

// a promise the test resolves by hand, so a sign-out can be held mid-flight
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    useUser.mockReturnValue({ user: ghost, loading: false })
    signOut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders nothing while firebase is still restoring the session", () => {
    useUser.mockReturnValue({ user: null, loading: true })

    render(<LogoutButton />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders nothing when nobody is signed in", () => {
    useUser.mockReturnValue({ user: null, loading: false })

    render(<LogoutButton />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders a Logout button for a signed-in user", () => {
    render(<LogoutButton />)

    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument()
  })

  it("signs the user out when clicked", async () => {
    const user = userEvent.setup()
    render(<LogoutButton />)

    await user.click(screen.getByRole("button", { name: "Logout" }))

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it("disables the button while signing out", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signOut.mockReturnValue(pending.promise)
    render(<LogoutButton />)

    await user.click(screen.getByRole("button", { name: "Logout" }))

    expect(screen.getByRole("button", { name: "Logout" })).toBeDisabled()

    await act(async () => {
      pending.resolve()
    })
  })

  it("ignores a second click while a sign-out is already in flight", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signOut.mockReturnValue(pending.promise)
    render(<LogoutButton />)

    await user.click(screen.getByRole("button", { name: "Logout" }))
    await user.click(screen.getByRole("button", { name: "Logout" }))

    expect(signOut).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve()
    })
  })

  it("leaves the button ready to retry when signing out fails", async () => {
    const user = userEvent.setup()
    // the component logs the failure itself; keep the test output readable
    vi.spyOn(console, "error").mockImplementation(() => {})
    signOut.mockRejectedValue(new Error("network request failed"))
    render(<LogoutButton />)

    await user.click(screen.getByRole("button", { name: "Logout" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled()
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
