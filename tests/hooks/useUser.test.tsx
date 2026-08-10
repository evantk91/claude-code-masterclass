import { render, renderHook, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import useUser from "@/hooks/useUser"
import AuthProvider from "@/components/AuthProvider"

const { onAuthStateChanged } = vi.hoisted(() => ({ onAuthStateChanged: vi.fn() }))

vi.mock("firebase/auth", () => ({ onAuthStateChanged }))
vi.mock("@/lib/firebase/config", () => ({ auth: {} }))

const ghost = { uid: "heist-1", email: "ghost@heist.dev", displayName: "Ghost" }
const mole = { uid: "heist-2", email: "mole@heist.dev", displayName: "Mole" }

// drives the observer Firebase was handed, standing in for a real auth event
function emitAuthState(user: unknown) {
  const observer = onAuthStateChanged.mock.calls[0][1]

  act(() => {
    observer(user)
  })
}

describe("useUser", () => {
  beforeEach(() => {
    onAuthStateChanged.mockReset()
    onAuthStateChanged.mockReturnValue(vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws when used outside an AuthProvider", () => {
    // React logs the failed render itself; keep the test output readable
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => renderHook(() => useUser())).toThrow("useUser must be used within an AuthProvider")
  })

  it("reports no user and still loading before firebase answers", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    expect(result.current).toEqual({ user: null, loading: true })
  })

  it("reports a signed-out user once firebase answers with none", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    emitAuthState(null)

    expect(result.current).toEqual({ user: null, loading: false })
  })

  it("reports the signed-in user once firebase answers", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    emitAuthState(ghost)

    expect(result.current).toEqual({ user: ghost, loading: false })
  })

  it("tracks auth changes after mount without remounting", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    emitAuthState(ghost)
    expect(result.current.user).toEqual(ghost)

    emitAuthState(mole)
    expect(result.current.user).toEqual(mole)

    emitAuthState(null)
    expect(result.current.user).toBeNull()
  })

  it("gives every consumer under one provider the same user", () => {
    function Greeting() {
      const { user } = useUser()

      return <p>greeting: {user?.displayName ?? "nobody"}</p>
    }

    function Badge() {
      const { user } = useUser()

      return <p>badge: {user?.displayName ?? "nobody"}</p>
    }

    render(<AuthProvider><Greeting /><Badge /></AuthProvider>)

    emitAuthState(ghost)

    expect(screen.getByText("greeting: Ghost")).toBeInTheDocument()
    expect(screen.getByText("badge: Ghost")).toBeInTheDocument()
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  })
})
